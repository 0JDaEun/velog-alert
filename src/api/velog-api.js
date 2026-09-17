import { CONFIG } from '../constants/config.js';
import { getVelogAccessToken, VelogAuthError } from './velog-auth.js';

const NOTIFICATIONS_FIELDS = `
  id
  type
  action
  actor_id
  action_id
  is_read
  created_at
`;

const FEED_POST_FIELDS = `
  id
  title
  short_description
  thumbnail
  user {
    id
    username
    profile {
      id
      thumbnail
      display_name
    }
  }
  url_slug
  released_at
  updated_at
  is_private
`;

const NOTIFICATIONS_QUERY = `
  query notification($input: NotificationsInput!) {
    notifications(input: $input) {
      ${NOTIFICATIONS_FIELDS}
    }
  }
`;

const ALERT_SNAPSHOT_QUERY = `
  query velogAlertSnapshot(
    $notificationInput: NotificationsInput!
    $feedInput: FeedPostsInput!
  ) {
    notifications(input: $notificationInput) {
      ${NOTIFICATIONS_FIELDS}
    }
    currentUser {
      id
      username
    }
    feedPosts(input: $feedInput) {
      ${FEED_POST_FIELDS}
    }
  }
`;

const FOLLOWINGS_QUERY = `
  query getFollowings($input: GetFollowInput!) {
    followings(input: $input) {
      id
      userId
      username
      profile {
        short_bio
        thumbnail
        display_name
      }
      is_followed
    }
  }
`;

export class VelogApiError extends Error {
  constructor(message, code = 'UNKNOWN', cause = null, details = null) {
    super(message);
    this.name = 'VelogApiError';
    this.code = code;
    this.cause = cause;
    this.details = details;
  }
}

export function getNotificationsGraphQLRequest() {
  return {
    operationName: 'notification',
    query: NOTIFICATIONS_QUERY,
    variables: {
      input: {},
    },
  };
}

export function getAlertSnapshotGraphQLRequest() {
  return {
    operationName: 'velogAlertSnapshot',
    query: ALERT_SNAPSHOT_QUERY,
    variables: {
      notificationInput: {},
      feedInput: {
        offset: 0,
        limit: CONFIG.FEED_LIMIT,
      },
    },
  };
}

function getFollowingsGraphQLRequest(username, cursor = null) {
  return {
    operationName: 'getFollowings',
    query: FOLLOWINGS_QUERY,
    variables: {
      input: {
        username,
        limit: CONFIG.FOLLOWINGS_PAGE_LIMIT,
        ...(cursor ? { cursor } : {}),
      },
    },
  };
}

function responseDetails(result) {
  return {
    status: result.status ?? 0,
    statusText: result.statusText ?? '',
    ok: Boolean(result.ok),
    url: result.url ?? CONFIG.GRAPHQL_ENDPOINT,
    redirected: Boolean(result.redirected),
    type: result.type ?? '',
    contentType: result.contentType ?? '',
    contentLength: result.contentLength ?? '',
    bodyLength: (result.bodyText ?? '').length,
    transport: result.transport ?? 'unknown',
  };
}

function parseTransportPayload(result) {
  const rawText = result.bodyText ?? '';
  const details = responseDetails(result);

  console.info('[Velog Alert] GraphQL response', details);

  if (result.bridgeError) {
    throw new VelogApiError(
      result.errorMessage || 'Velog 페이지 브리지 요청에 실패했습니다.',
      result.errorCode || 'BRIDGE_REQUEST_FAILED',
      null,
      details
    );
  }

  if (!result.ok) {
    let code = 'HTTP_ERROR';

    if (result.status === 401) code = 'UNAUTHORIZED';
    else if (result.status === 403) code = 'FORBIDDEN';
    else if (result.status === 404) code = 'ENDPOINT_NOT_FOUND';

    throw new VelogApiError(
      `Velog 요청 실패: HTTP ${result.status}${result.statusText ? ` ${result.statusText}` : ''}`,
      code,
      null,
      details
    );
  }

  if (!rawText.trim()) {
    throw new VelogApiError(
      `Velog가 빈 응답을 반환했습니다. (HTTP ${result.status})`,
      'EMPTY_RESPONSE',
      null,
      details
    );
  }

  let payload;

  try {
    payload = JSON.parse(rawText);
  } catch (error) {
    throw new VelogApiError(
      'Velog 응답이 JSON 형식이 아닙니다.',
      'INVALID_JSON',
      error,
      {
        ...details,
        bodyPreview: rawText.slice(0, 120),
      }
    );
  }

  if (payload?.errors?.length) {
    const message = payload.errors
      .map((item) => item?.message)
      .filter(Boolean)
      .join(' / ') || 'Velog GraphQL 오류';

    const unauthorized = /not logged in|unauthorized|login/i.test(message);

    throw new VelogApiError(
      unauthorized ? 'Velog 로그인이 필요합니다.' : message,
      unauthorized ? 'UNAUTHORIZED' : 'GRAPHQL_ERROR',
      null,
      details
    );
  }

  if (!payload?.data || typeof payload.data !== 'object') {
    throw new VelogApiError(
      'Velog GraphQL data가 없습니다.',
      'SCHEMA_CHANGED',
      null,
      details
    );
  }

  return payload.data;
}

async function requestGraphQLDirect(request) {
  let auth;

  try {
    auth = await getVelogAccessToken();
  } catch (error) {
    if (error instanceof VelogAuthError) {
      throw new VelogApiError(
        error.message,
        error.code,
        error,
        {
          ...(error.details ?? {}),
          transport: 'bearer-cookie',
        }
      );
    }
    throw error;
  }

  let response;

  try {
    response = await fetch(CONFIG.GRAPHQL_ENDPOINT, {
      method: 'POST',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify(request),
    });
  } catch (error) {
    throw new VelogApiError(
      'Velog 서버에 연결할 수 없습니다.',
      'NETWORK',
      error,
      {
        endpoint: CONFIG.GRAPHQL_ENDPOINT,
        transport: 'bearer-cookie',
        accessTokenPresent: true,
      }
    );
  }

  let bodyText = '';

  try {
    bodyText = await response.text();
  } catch (error) {
    throw new VelogApiError(
      'Velog 응답 본문을 읽을 수 없습니다.',
      'READ_RESPONSE_FAILED',
      error,
      {
        status: response.status,
        statusText: response.statusText,
        endpoint: CONFIG.GRAPHQL_ENDPOINT,
        transport: 'bearer-cookie',
      }
    );
  }

  return {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    url: response.url,
    redirected: response.redirected,
    type: response.type,
    contentType: response.headers.get('content-type') || '',
    contentLength: response.headers.get('content-length') || '',
    bodyText,
    transport: 'bearer-cookie',
    authMeta: auth.meta,
  };
}

async function requestGraphQLWithTransport(transport, request) {
  let result;

  try {
    result = await transport(request);
  } catch (error) {
    if (error instanceof VelogApiError) throw error;

    throw new VelogApiError(
      'Velog 페이지 브리지 요청에 실패했습니다.',
      'BRIDGE_REQUEST_FAILED',
      error,
      { transport: 'velog-page' }
    );
  }

  return {
    ...result,
    transport: result?.transport ?? 'velog-page',
  };
}

function validateNotifications(data) {
  if (!Array.isArray(data?.notifications)) {
    throw new VelogApiError(
      'notifications 응답 형식이 예상과 다릅니다.',
      'SCHEMA_CHANGED',
      null,
      {
        dataKeys: data ? Object.keys(data) : [],
      }
    );
  }

  return data.notifications;
}

function validateAlertSnapshot(data) {
  if (!Array.isArray(data?.notifications) || !Array.isArray(data?.feedPosts)) {
    throw new VelogApiError(
      'Velog Alert snapshot 응답 형식이 예상과 다릅니다.',
      'SCHEMA_CHANGED',
      null,
      {
        dataKeys: data ? Object.keys(data) : [],
      }
    );
  }

  if (!data.currentUser?.username) {
    throw new VelogApiError(
      '현재 Velog 사용자를 확인할 수 없습니다.',
      'UNAUTHORIZED'
    );
  }

  return {
    notifications: data.notifications,
    feedPosts: data.feedPosts,
    currentUser: data.currentUser,
  };
}

async function fetchFollowingsPages(requestFn, username) {
  const results = [];
  let cursor = null;

  for (let page = 0; page < CONFIG.MAX_FOLLOWINGS_PAGES; page += 1) {
    const request = getFollowingsGraphQLRequest(username, cursor);
    const transportResult = await requestFn(request);
    const data = parseTransportPayload(transportResult);

    if (!Array.isArray(data?.followings)) {
      throw new VelogApiError(
        'followings 응답 형식이 예상과 다릅니다.',
        'SCHEMA_CHANGED',
        null,
        {
          dataKeys: data ? Object.keys(data) : [],
        }
      );
    }

    results.push(...data.followings);

    if (data.followings.length < CONFIG.FOLLOWINGS_PAGE_LIMIT) {
      break;
    }

    const nextCursor = data.followings.at(-1)?.id;
    if (!nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
  }

  return results.slice(0, CONFIG.MAX_KNOWN_FOLLOWINGS);
}

export async function fetchNotifications() {
  const result = await requestGraphQLDirect(getNotificationsGraphQLRequest());
  return validateNotifications(parseTransportPayload(result));
}

export async function fetchNotificationsWithTransport(transport) {
  const result = await requestGraphQLWithTransport(
    transport,
    getNotificationsGraphQLRequest()
  );
  return validateNotifications(parseTransportPayload(result));
}

export async function fetchAlertSnapshot() {
  const result = await requestGraphQLDirect(getAlertSnapshotGraphQLRequest());
  return validateAlertSnapshot(parseTransportPayload(result));
}

export async function fetchAlertSnapshotWithTransport(transport) {
  const result = await requestGraphQLWithTransport(
    transport,
    getAlertSnapshotGraphQLRequest()
  );
  return validateAlertSnapshot(parseTransportPayload(result));
}

export async function fetchFollowings(username) {
  return fetchFollowingsPages(requestGraphQLDirect, username);
}

export async function fetchFollowingsWithTransport(transport, username) {
  return fetchFollowingsPages(
    (request) => requestGraphQLWithTransport(transport, request),
    username
  );
}
