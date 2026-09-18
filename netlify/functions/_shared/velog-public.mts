const VELOG_GRAPHQL_ENDPOINT = "https://v2.velog.io/graphql";

const POSTS_QUERY = `
  query Posts($cursor: ID, $limit: Int) {
    posts(cursor: $cursor, limit: $limit) {
      id
      title
      url_slug
      released_at
      user {
        username
      }
    }
  }
`;

export type PublicVelogPost = {
  id: string;
  title: string | null;
  url_slug: string | null;
  released_at: string | null;
  user: {
    username: string | null;
  } | null;
};

export async function fetchPublicPosts({
  cursor = null,
  limit = 100,
}: {
  cursor?: string | null;
  limit?: number;
} = {}) {
  const response = await fetch(VELOG_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      operationName: "Posts",
      query: POSTS_QUERY,
      variables: {
        cursor,
        limit,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`VELOG_PUBLIC_HTTP_${response.status}`);
  }

  const payload = await response.json();

  if (payload?.errors?.length) {
    throw new Error(
      payload.errors
        .map((item: { message?: string }) => item?.message)
        .filter(Boolean)
        .join(" / ") || "VELOG_PUBLIC_GRAPHQL_ERROR",
    );
  }

  if (!Array.isArray(payload?.data?.posts)) {
    throw new Error("VELOG_PUBLIC_SCHEMA_CHANGED");
  }

  return payload.data.posts as PublicVelogPost[];
}
