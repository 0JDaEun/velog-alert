function buildPostUrl(action) {
  if (!action?.post_writer_username || !action?.post_url_slug) {
    return 'https://velog.io/notifications';
  }

  return `https://velog.io/@${action.post_writer_username}/${action.post_url_slug}`;
}

function actorName(action) {
  return action?.actor_display_name || action?.actor_username || 'Velog 사용자';
}

function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function normalizeNotification(raw) {
  const action = raw?.action ?? {};
  const base = {
    id: raw?.id,
    type: raw?.type ?? 'unknown',
    actorId: raw?.actor_id ?? null,
    actionId: raw?.action_id ?? null,
    createdAt: raw?.created_at ?? null,
    isRead: Boolean(raw?.is_read),
    actor: {
      username: action?.actor_username ?? '',
      displayName: action?.actor_display_name ?? '',
      thumbnail: action?.actor_thumbnail ?? '',
    },
    post: null,
    message: '',
    url: 'https://velog.io/notifications',
  };

  switch (raw?.type) {
    case 'comment': {
      const message = safeText(action.comment_text, '새 댓글이 작성되었습니다.');
      return {
        ...base,
        post: {
          id: action.post_id ?? null,
          title: safeText(action.post_title, 'Velog 게시글'),
          username: action.post_writer_username ?? '',
          slug: action.post_url_slug ?? '',
        },
        message,
        url: buildPostUrl(action),
        displayTitle: 'Velog 새 댓글',
        displayMessage: `${actorName(action)}: ${message}`,
      };
    }

    case 'commentReply': {
      const message = safeText(action.reply_comment_text, '새 답글이 작성되었습니다.');
      return {
        ...base,
        post: {
          id: action.post_id ?? null,
          // 현재 Velog commentReply action 스키마에는 post_title이 없을 수 있다.
          title: safeText(action.post_title, '댓글 답글'),
          username: action.post_writer_username ?? '',
          slug: action.post_url_slug ?? '',
        },
        message,
        url: buildPostUrl(action),
        displayTitle: 'Velog 새 답글',
        displayMessage: `${actorName(action)}: ${message}`,
      };
    }

    case 'postLike':
      return {
        ...base,
        post: {
          id: action.post_id ?? null,
          title: safeText(action.post_title, 'Velog 게시글'),
          username: action.post_writer_username ?? '',
          slug: action.post_url_slug ?? '',
        },
        message: `${actorName(action)}님이 글에 좋아요를 눌렀습니다.`,
        url: buildPostUrl(action),
        displayTitle: 'Velog 새 좋아요',
        displayMessage: `${actorName(action)}님이 글에 좋아요를 눌렀습니다.`,
      };

    case 'follow':
      return {
        ...base,
        message: `${actorName(action)}님이 팔로우했습니다.`,
        url: action.actor_username
          ? `https://velog.io/@${action.actor_username}/posts`
          : 'https://velog.io/notifications',
        displayTitle: 'Velog 새 팔로워',
        displayMessage: `${actorName(action)}님이 팔로우했습니다.`,
      };

    default:
      return {
        ...base,
        message: '새로운 Velog 활동이 있습니다.',
        displayTitle: 'Velog 새 알림',
        displayMessage: '새로운 Velog 활동이 있습니다.',
      };
  }
}

export function normalizeNotifications(rawNotifications = []) {
  return rawNotifications
    .filter((item) => item?.id)
    .map(normalizeNotification);
}
