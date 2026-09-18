const GRAPHQL_ENDPOINT = "https://v3.velog.io/graphql";

const CLOUD_QUERY = `
  query velogAlertCloudSnapshot($notificationInput: NotificationsInput!) {
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
  }
`;

export type CloudNotification = {
  id: string;
  type: string;
  action?: Record<string, unknown> | null;
  actor_id?: string | null;
  action_id?: string | null;
  is_read?: boolean;
  created_at?: string | null;
};

function parseSetCookies(headers: Headers) {
  const values =
    typeof (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean) as string[];

  const result: Record<string, string> = {};

  for (const value of values) {
    const match = value.match(/^(access_token|refresh_token)=([^;]*)/);
    if (match) result[match[1]] = match[2];
  }

  return result;
}

export async function fetchAuthenticatedSnapshot(tokens: {
  accessToken?: string | null;
  refreshToken: string;
}) {
  const cookieParts = [];
  if (tokens.accessToken) cookieParts.push(`access_token=${tokens.accessToken}`);
  cookieParts.push(`refresh_token=${tokens.refreshToken}`);

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Cookie": cookieParts.join("; "),
    },
    body: JSON.stringify({
      operationName: "velogAlertCloudSnapshot",
      query: CLOUD_QUERY,
      variables: {
        notificationInput: {},
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`VELOG_AUTH_HTTP_${response.status}`);
  }

  const payload = await response.json();

  if (payload?.errors?.length) {
    const message = payload.errors
      .map((item: { message?: string }) => item?.message)
      .filter(Boolean)
      .join(" / ");

    throw new Error(/not logged in|unauthorized|login/i.test(message)
      ? "VELOG_AUTH_EXPIRED"
      : "VELOG_GRAPHQL_ERROR");
  }

  if (!payload?.data?.currentUser?.username || !Array.isArray(payload?.data?.notifications)) {
    throw new Error("VELOG_AUTH_EXPIRED");
  }

  const rotated = parseSetCookies(response.headers);

  return {
    currentUser: payload.data.currentUser as { id: string; username: string },
    notifications: payload.data.notifications as CloudNotification[],
    tokens: {
      accessToken: rotated.access_token || tokens.accessToken || null,
      refreshToken: rotated.refresh_token || tokens.refreshToken,
    },
  };
}
