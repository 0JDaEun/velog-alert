import { CONFIG } from '../constants/config.js';
import { getVelogAccessToken, VelogAuthError } from './velog-auth.js';

const NOTIFICATIONS_QUERY = `
  query notification($input: NotificationsInput!) {
    notifications(input: $input) {
      id
      type
      action
      actor_id
      action_id
      is_read
      created_at
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

function parseTransportResult(result) {
  const rawText = result.bodyText ?? '';
  const details = responseDetails(result);

  console.info('[Velog Alert] GraphQL response', details);

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

  if (!Array.isArray(payload?.data?.notifications)) {
    throw new VelogApiError(
      'notifications 응답 형식이 예상과 다릅니다.',
      'SCHEMA_CHANGED',
      null,
      {
        ...details,
        dataKeys: payload?.data ? Object.keys(payload.data) : [],
      }
    );
  }

  return payload.data.notifications;
}

async function requestGraphQLDirect() {
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
      body: JSON.stringify(getNotificationsGraphQLRequest()),
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

export async function fetchNotifications() {
  const result = await requestGraphQLDirect();
  return parseTransportResult(result);
}

export async function fetchNotificationsWithTransport(transport) {
  let result;

  try {
    result = await transport(getNotificationsGraphQLRequest());
  } catch (error) {
    if (error instanceof VelogApiError) throw error;

    throw new VelogApiError(
      'Velog 페이지 브리지 요청에 실패했습니다.',
      'BRIDGE_REQUEST_FAILED',
      error,
      { transport: 'velog-page' }
    );
  }

  return parseTransportResult({
    ...result,
    transport: result?.transport ?? 'velog-page',
  });
}
