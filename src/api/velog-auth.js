export class VelogAuthError extends Error {
  constructor(message, code = 'AUTH_ERROR', details = null) {
    super(message);
    this.name = 'VelogAuthError';
    this.code = code;
    this.details = details;
  }
}

async function findCookie(name) {
  // Velog production auth cookies use the .velog.io domain.
  // Query both common URLs to make the lookup resilient to host scoping.
  const urls = [
    'https://velog.io/',
    'https://v3.velog.io/',
  ];

  for (const url of urls) {
    const cookie = await chrome.cookies.get({ url, name });
    if (cookie?.value) return cookie;
  }

  const candidates = await chrome.cookies.getAll({
    domain: 'velog.io',
    name,
  });

  return candidates.find((cookie) => cookie?.value) ?? null;
}

export async function getVelogAccessToken() {
  const cookie = await findCookie('access_token');

  if (!cookie?.value) {
    throw new VelogAuthError(
      'Velog access_token 쿠키를 찾지 못했습니다. Velog에 로그인한 뒤 페이지를 한 번 새로고침해주세요.',
      'ACCESS_TOKEN_MISSING',
      {
        cookieFound: false,
      }
    );
  }

  return {
    token: cookie.value,
    meta: {
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      session: cookie.session,
      expirationDate: cookie.expirationDate ?? null,
    },
  };
}

export async function getVelogAuthDiagnostics() {
  const access = await findCookie('access_token');
  const refresh = await findCookie('refresh_token');

  // Never return cookie values.
  return {
    accessTokenPresent: Boolean(access?.value),
    refreshTokenPresent: Boolean(refresh?.value),
    accessTokenMeta: access ? {
      domain: access.domain,
      httpOnly: access.httpOnly,
      secure: access.secure,
      session: access.session,
      expirationDate: access.expirationDate ?? null,
    } : null,
    refreshTokenMeta: refresh ? {
      domain: refresh.domain,
      httpOnly: refresh.httpOnly,
      secure: refresh.secure,
      session: refresh.session,
      expirationDate: refresh.expirationDate ?? null,
    } : null,
  };
}
