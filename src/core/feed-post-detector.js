export function detectNewFeedPosts(posts, state, currentFollowings = []) {
  const seen = new Set(state.seenFeedPostIds ?? []);
  const previousFollowings = new Set(state.knownFollowingUserIds ?? []);
  const currentFollowingUserIds = currentFollowings
    .map((item) => item?.userId)
    .filter(Boolean);

  if (!state.feedInitialized) {
    return {
      initializedNow: true,
      newPosts: [],
      allCurrentIds: posts.map((item) => item.id),
      currentFollowingUserIds,
      newlyFollowedUserIds: [],
    };
  }

  const newlyFollowed = new Set(
    currentFollowingUserIds.filter((userId) => !previousFollowings.has(userId))
  );

  const newPosts = posts
    .filter((item) => !seen.has(item.id))
    .filter((item) => {
      const authorId = item.actor?.id;
      return !authorId || !newlyFollowed.has(authorId);
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });

  return {
    initializedNow: false,
    newPosts,
    allCurrentIds: posts.map((item) => item.id),
    currentFollowingUserIds,
    newlyFollowedUserIds: [...newlyFollowed],
  };
}
