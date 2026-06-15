function securityHeaders() {
  return {
    'content-security-policy': {
      value: "default-src 'self'; base-uri 'self'; connect-src 'self' https://on-demand-demos.bozhi.dev https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; frame-ancestors 'none'; img-src 'self' data: https://platform-academy.bozhi.dev https://images.unsplash.com; object-src 'none'; script-src 'self' https://on-demand-demos.bozhi.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; upgrade-insecure-requests",
    },
    'strict-transport-security': { value: 'max-age=31536000; includeSubDomains; preload' },
    'x-content-type-options': { value: 'nosniff' },
    'x-frame-options': { value: 'DENY' },
    'referrer-policy': { value: 'strict-origin-when-cross-origin' },
    'cross-origin-opener-policy': { value: 'same-origin' },
    'permissions-policy': { value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  };
}

function applySecurityHeaders(response) {
  var headers = securityHeaders();
  response.headers = response.headers || {};

  for (var name in headers) {
    response.headers[name] = headers[name];
  }

  return response;
}

function apiUnavailableResponse() {
  return applySecurityHeaders({
    statusCode: 404,
    statusDescription: 'Not Found',
    headers: {
      'content-type': { value: 'application/json' },
      'cache-control': { value: 'no-store' },
      'x-robots-tag': { value: 'noindex, nofollow' },
    },
    body: '{"status":"not_found","message":"This static portfolio host is not connected to the Campaign API. Start an approved demo environment for API-backed workflows."}',
  });
}

function shouldRejectStaticApiRoute(uri) {
  return uri === '/api' || uri.indexOf('/api/') === 0 || uri === '/r' || uri.indexOf('/r/') === 0;
}

function shouldServeSpaShell(uri) {
  return uri !== '/' && uri.indexOf('.') === -1;
}

function isSpaNavigationMethod(request) {
  return request.method === 'GET' || request.method === 'HEAD';
}

function handler(event) {
  var request = event.request;

  if (event.response) {
    return applySecurityHeaders(event.response);
  }

  var uri = request.uri || '/';

  if (shouldRejectStaticApiRoute(uri)) {
    return apiUnavailableResponse();
  }

  if (isSpaNavigationMethod(request) && shouldServeSpaShell(uri)) {
    request.uri = '/index.html';
  }

  return request;
}
