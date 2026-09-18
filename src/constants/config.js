export const CONFIG = {
  GRAPHQL_ENDPOINT: 'https://v3.velog.io/graphql',
  ALARM_NAME: 'velog-alert-check',
  DEFAULT_INTERVAL_MINUTES: 1,
  MAX_SEEN_IDS: 200,
  MAX_SEEN_FEED_POST_IDS: 300,
  MAX_KNOWN_FOLLOWINGS: 3000,
  MAX_NOTIFICATION_LINKS: 100,
  BRIDGE_TIMEOUT_MS: 8000,
  OFFSCREEN_PATH: 'src/offscreen/offscreen.html',
  MAX_HISTORY: 50,
  FEED_LIMIT: 30,
  FOLLOWINGS_PAGE_LIMIT: 100,
  MAX_FOLLOWINGS_PAGES: 30,
  ALLOWED_INTERVALS: [0.5, 1, 5, 10, 30],
};

export const DEFAULT_SETTINGS = {
  enabled: true,
  comment: true,
  commentReply: true,
  postLike: false,
  follow: false,
  followPost: true,
  intervalMinutes: CONFIG.DEFAULT_INTERVAL_MINUTES,
};
