import type { Frontier, MobileEvent } from "./types";

const VELOG_GRAPHQL_ENDPOINT = "https://v3.velog.io/graphql";
const FEED_LIMIT = 50;

const SNAPSHOT_QUERY = `
  query velogAlertCloudSnapshot(
    $notificationInput: NotificationsInput!
    $feedInput: FeedPostsInput!
  ) {
    notifications(input: $notificationInput) {
      id
      type
      action
      actor_id
      action_id
      is_read
      created_at
    }
    currentUser {
      id
      username
    }
    feedPosts(input: $feedInput) {
      id
      title
      short_description
      thumbnail
      user {
        id
        username
        profile {
          display_name
        }
      }
      url_slug
      released_at
      updated_at
      is_private
    }
  }
`;

export type VelogTokens = {
  accessToken?: string | null;
  refreshToken: string;
};

export type RawNotification = {
  id: string;
  type: string;
  action?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type RawFeedPost = {
  id: string;
  title?: string | null;
  url_slug?: string | null;
  released_at?: string | null;
  updated_at?: string | null;
  user?: {
    id?: string | null;
    username?: string | null;
    profile?: {
      display_name?: string | null;
    } | null;
  } | null;
};

export type VelogSnapshot = {
  currentUser: {
    id: string;
    username: string;
  };
  notifications: RawNotification[];
  feedPosts: RawFeedPost[];
  tokens: VelogTokens;
};

function parseSetCookies(headers: Headers) {
  const values = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie")].filter(Boolean) as string[];

  const result: Record<string, string> = {};

  for (const value of values) {
    const match = value.match(/^(access_token|refresh_token)=([^;]*)/);
    if (match) result[match[1]] = match[2];
  }

  return result;
}

export async function fetchVelogSnapshot(tokens: VelogTokens): Promise<VelogSnapshot> {
  const cookie = [
    tokens.accessToken ? `access_token=${tokens.accessToken}` : "",
    `refresh_token=${tokens.refreshToken}`,
  ].filter(Boolean).join("; ");

  const response = await fetch(VELOG_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Cookie": cookie,
    },
    body: JSON.stringify({
      operationName: "velogAlertCloudSnapshot",
      query: SNAPSHOT_QUERY,
      variables: {
        notificationInput: {},
        feedInput: {
          offset: 0,
          limit: FEED_LIMIT,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`VELOG_HTTP_${response.status}`);
  }

  const payload = await response.json() as {
    data?: {
      currentUser?: { id?: string; username?: string } | null;
      notifications?: RawNotification[];
      feedPosts?: RawFeedPost[];
    };
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    const message = payload.errors.map((item) => item.message).filter(Boolean).join(" / ");
    throw new Error(
      /not logged in|unauthorized|login/i.test(message)
        ? "VELOG_AUTH_EXPIRED"
        : "VELOG_GRAPHQL_ERROR",
    );
  }

  if (
    !payload.data?.currentUser?.id ||
    !payload.data.currentUser.username ||
    !Array.isArray(payload.data.notifications) ||
    !Array.isArray(payload.data.feedPosts)
  ) {
    throw new Error("VELOG_AUTH_EXPIRED");
  }

  const rotated = parseSetCookies(response.headers);

  return {
    currentUser: {
      id: payload.data.currentUser.id,
      username: payload.data.currentUser.username,
    },
    notifications: payload.data.notifications,
    feedPosts: payload.data.feedPosts,
    tokens: {
      accessToken: rotated.access_token || tokens.accessToken || null,
      refreshToken: rotated.refresh_token || tokens.refreshToken,
    },
  };
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function actorName(action: Record<string, unknown>) {
  return (
    safeText(action.actor_display_name) ||
    safeText(action.actor_username) ||
    "Velog 사용자"
  );
}

function postUrl(action: Record<string, unknown>) {
  const username = safeText(action.post_writer_username);
  const slug = safeText(action.post_url_slug);

  return username && slug
    ? `https://velog.io/@${username}/${slug}`
    : "https://velog.io/notifications";
}

export function notificationToEvent(item: RawNotification): MobileEvent | null {
  const action = (item.action ?? {}) as Record<string, unknown>;
  const createdAt = item.created_at || new Date().toISOString();

  switch (item.type) {
    case "comment": {
      const message = safeText(action.comment_text, "새 댓글이 작성되었습니다.");
      return {
        eventKey: `comment:${item.id}`,
        type: "comment",
        title: "Velog 새 댓글",
        body: `${actorName(action)}: ${message}`,
        url: postUrl(action),
        createdAt,
      };
    }

    case "commentReply": {
      const message = safeText(action.reply_comment_text, "새 답글이 작성되었습니다.");
      return {
        eventKey: `commentReply:${item.id}`,
        type: "commentReply",
        title: "Velog 새 답글",
        body: `${actorName(action)}: ${message}`,
        url: postUrl(action),
        createdAt,
      };
    }

    case "postLike":
      return {
        eventKey: `postLike:${item.id}`,
        type: "postLike",
        title: "Velog 새 좋아요",
        body: `${actorName(action)}님이 글에 좋아요를 눌렀습니다.`,
        url: postUrl(action),
        createdAt,
      };

    case "follow": {
      const username = safeText(action.actor_username);
      return {
        eventKey: `follow:${item.id}`,
        type: "follow",
        title: "Velog 새 팔로워",
        body: `${actorName(action)}님이 팔로우했습니다.`,
        url: username
          ? `https://velog.io/@${username}/posts`
          : "https://velog.io/notifications",
        createdAt,
      };
    }

    default:
      return null;
  }
}

export function feedPostToEvent(post: RawFeedPost): MobileEvent | null {
  if (!post.id) return null;

  const username = post.user?.username || "";
  const displayName = post.user?.profile?.display_name || username || "Velog 사용자";
  const title = post.title || "새 게시물";
  const slug = post.url_slug || "";

  return {
    eventKey: `followPost:feed-post:${post.id}`,
    type: "followPost",
    title: "Velog 새 게시물",
    body: `${displayName}님이 새 글을 작성했습니다. · ${title}`,
    url: username && slug
      ? `https://velog.io/@${username}/${slug}`
      : "https://velog.io/feed",
    createdAt: post.released_at || post.updated_at || new Date().toISOString(),
  };
}

export function makeFrontier<T>(
  items: T[],
  idOf: (item: T) => string | null | undefined,
  timeOf: (item: T) => string | null | undefined,
): Frontier {
  const valid = items
    .map((item) => ({
      id: idOf(item),
      time: timeOf(item),
    }))
    .filter((item): item is { id: string; time: string } => Boolean(item.id && item.time))
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));

  const latestCreatedAt = valid[0]?.time ?? null;

  return {
    latestCreatedAt,
    idsAtLatest: latestCreatedAt
      ? valid.filter((item) => item.time === latestCreatedAt).map((item) => item.id)
      : [],
  };
}

export function itemsAfterFrontier<T>(
  items: T[],
  frontier: Frontier | null,
  idOf: (item: T) => string | null | undefined,
  timeOf: (item: T) => string | null | undefined,
) {
  if (!frontier?.latestCreatedAt) return [];

  const frontierTime = Date.parse(frontier.latestCreatedAt);
  const frontierIds = new Set(frontier.idsAtLatest);

  return items
    .filter((item) => {
      const id = idOf(item);
      const time = timeOf(item);
      if (!id || !time) return false;

      const parsed = Date.parse(time);
      return parsed > frontierTime || (parsed === frontierTime && !frontierIds.has(id));
    })
    .sort((a, b) => Date.parse(timeOf(a) || "") - Date.parse(timeOf(b) || ""));
}
