(() => {
  if (window.top === window && location.hostname === 'velog.io') {
    console.debug('[Velog Alert] Velog page bridge active');
  }

  const port = chrome.runtime.connect({
    name: 'velog-page-bridge',
  });

  async function performGraphQL(request) {
    let response;

    try {
      response = await fetch('https://v3.velog.io/graphql', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(request),
      });
    } catch (error) {
      return {
        ok: false,
        bridgeError: true,
        errorCode: 'NETWORK',
        errorMessage: error?.message ?? 'Velog GraphQL 네트워크 오류',
        transport: 'velog-page',
      };
    }

    let bodyText = '';

    try {
      bodyText = await response.text();
    } catch (error) {
      return {
        ok: false,
        bridgeError: true,
        errorCode: 'READ_RESPONSE_FAILED',
        errorMessage: error?.message ?? 'Velog 응답 읽기 실패',
        transport: 'velog-page',
      };
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
      transport: 'velog-page',
      frameUrl: location.href,
    };
  }

  port.onMessage.addListener(async (message) => {
    if (message?.type !== 'GRAPHQL_REQUEST') return;

    const result = await performGraphQL(message.request);

    port.postMessage({
      type: 'GRAPHQL_RESPONSE',
      requestId: message.requestId,
      result,
    });
  });

  port.postMessage({
    type: 'BRIDGE_READY',
    pageUrl: location.href,
    topLevel: window.top === window,
  });
})();
