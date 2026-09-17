function buildPostUrl(post) {
  const username = post?.user?.username;
  const slug = post?.url_slug;

  if (!username || !slug) return 'https://velog.io/feed';
  return `https://velog.io/@${username}/${slug}`;
}

function actorFromPost(post) {
  return {
    id: post?.user?.id ?? null,
    username: post?.user?.username ?? '',
    displayName:
      post?.user?.profile?.display_name ||
      post?.user?.username ||
      'Velog 사용자',
    thumbnail: post?.user?.profile?.thumbnail ?? null,
  };
}

export function normalizeFeedPost(post) {
  if (!post?.id) return null;

  const actor = actorFromPost(post);
  const title = post?.title || '새 게시물';

  return {
    id: `feed-post:${post.id}`,
    sourceId: post.id,
    type: 'followPost',
    createdAt: post?.released_at || post?.updated_at || null,
    actor,
    post: {
      id: post.id,
      title,
      urlSlug: post?.url_slug ?? '',
      shortDescription: post?.short_description ?? '',
      thumbnail: post?.thumbnail ?? null,
    },
    displayTitle: 'Velog 새 게시물',
    displayMessage: `${actor.displayName}님이 새 글을 작성했습니다. · ${title}`,
    message: `${actor.displayName}님이 새 글을 작성했습니다.`,
    url: buildPostUrl(post),
  };
}

export function normalizeFeedPosts(posts = []) {
  return posts
    .map(normalizeFeedPost)
    .filter(Boolean);
}
