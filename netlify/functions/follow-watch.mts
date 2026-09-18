import type { Config } from "@netlify/functions";
import { deliverEventToExtension } from "./_shared/push-delivery.mts";
import {
  followWatchStore,
  type FollowWatchRecord,
  type GlobalPostState,
} from "./_shared/stores.mts";
import {
  fetchPublicPosts,
  type PublicVelogPost,
} from "./_shared/velog-public.mts";

const PAGE_SIZE = 100;
const MAX_PAGES = 3;
const MAX_SEEN_POST_IDS = 500;

function postUrl(post: PublicVelogPost) {
  const username = post.user?.username;
  const slug = post.url_slug;
  if (!username || !slug) return "https://velog.io";
  return `https://velog.io/@${username}/${slug}`;
}

export default async () => {
  const store = followWatchStore();
  const globalState = (await store.get("global:recent-posts", {
    type: "json",
  })) as GlobalPostState | null;
  const seen = new Set(globalState?.seenPostIds ?? []);

  const fetchedPosts: PublicVelogPost[] = [];
  let cursor: string | null = null;
  let reachedKnownPost = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const posts = await fetchPublicPosts({ cursor, limit: PAGE_SIZE });
    if (posts.length === 0) break;

    fetchedPosts.push(...posts);

    if (posts.some((post) => seen.has(post.id))) {
      reachedKnownPost = true;
      break;
    }

    if (posts.length < PAGE_SIZE) break;
    cursor = posts.at(-1)?.id ?? null;
    if (!cursor) break;
  }

  const fetchedIds = fetchedPosts.map((post) => post.id).filter(Boolean);
  const nextSeen = [
    ...new Set([...fetchedIds, ...(globalState?.seenPostIds ?? [])]),
  ].slice(0, MAX_SEEN_POST_IDS);

  if (!globalState?.initialized) {
    await store.setJSON("global:recent-posts", {
      initialized: true,
      seenPostIds: nextSeen,
      updatedAt: new Date().toISOString(),
    } satisfies GlobalPostState);

    console.info("[follow-watch] initialized public-post baseline", {
      fetched: fetchedPosts.length,
    });
    return;
  }

  const newPosts = fetchedPosts
    .filter((post) => !seen.has(post.id))
    .reverse();

  const { blobs } = await store.list({ prefix: "watch:" });
  const watchers: FollowWatchRecord[] = [];

  for (const blob of blobs) {
    const record = (await store.get(blob.key, {
      type: "json",
    })) as FollowWatchRecord | null;

    if (record?.enabled && record.followingUsernames.length > 0) {
      watchers.push(record);
    }
  }

  const usernameToExtensions = new Map<string, string[]>();
  for (const watcher of watchers) {
    for (const username of watcher.followingUsernames) {
      const current = usernameToExtensions.get(username) ?? [];
      current.push(watcher.extensionHash);
      usernameToExtensions.set(username, current);
    }
  }

  let matchedPosts = 0;
  let delivered = 0;

  for (const post of newPosts) {
    const username = post.user?.username;
    if (!username) continue;

    const extensionHashes = usernameToExtensions.get(username) ?? [];
    if (extensionHashes.length === 0) continue;

    matchedPosts += 1;

    const event = {
      eventKey: `followPost:feed-post:${post.id}`,
      type: "followPost",
      title: "Velog 새 게시물",
      body: `${username}님이 새 글을 작성했습니다. · ${post.title || "새 게시물"}`,
      url: postUrl(post),
      createdAt: post.released_at || new Date().toISOString(),
    };

    for (const extensionHash of extensionHashes) {
      try {
        const result = await deliverEventToExtension(extensionHash, event);
        delivered += Number(result?.delivered ?? 0);
      } catch (error) {
        console.error("[follow-watch] delivery failed", error);
      }
    }
  }

  await store.setJSON("global:recent-posts", {
    initialized: true,
    seenPostIds: nextSeen,
    updatedAt: new Date().toISOString(),
  } satisfies GlobalPostState);

  console.info("[follow-watch] completed", {
    fetched: fetchedPosts.length,
    newPosts: newPosts.length,
    matchedPosts,
    delivered,
    watchers: watchers.length,
    reachedKnownPost,
  });
};

export const config: Config = {
  schedule: "* * * * *",
};
