function apiUnavailableResponse() {
  return {
    statusCode: 404,
    statusDescription: 'Not Found',
    headers: {
      'content-type': { value: 'application/json' },
      'cache-control': { value: 'no-store' },
      'x-robots-tag': { value: 'noindex, nofollow' },
    },
    body: '{"status":"not_found","message":"This static portfolio host is not connected to the Campaign API. Start an approved demo environment for API-backed workflows."}',
  };
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
  var uri = request.uri || '/';

  if (shouldRejectStaticApiRoute(uri)) {
    return apiUnavailableResponse();
  }

  if (isSpaNavigationMethod(request) && shouldServeSpaShell(uri)) {
    request.uri = '/index.html';
  }

  return request;
}
