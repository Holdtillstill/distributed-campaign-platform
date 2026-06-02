import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = await readFile(new URL('../deploy/cloudfront/static-spa-router.js', import.meta.url), 'utf8')

function route(uri, method = 'GET') {
  const context = {
    event: {
      request: {
        method,
        uri,
        headers: {},
      },
    },
  }
  return vm.runInNewContext(`${source}\nhandler(event);`, context)
}

for (const uri of ['/api', '/api/healthz', '/api/me/memberships', '/r/campaign-link']) {
  const response = route(uri)
  assert.equal(response.statusCode, 404, `${uri} should return an edge 404`)
  assert.equal(response.headers['content-type'].value, 'application/json')
  assert.match(response.body, /Campaign API/)
}

for (const uri of ['/app', '/features/broadcast-monitor', '/kb/articles', '/internal/dashboard']) {
  const request = route(uri)
  assert.equal(request.uri, '/index.html', `${uri} should rewrite to the SPA shell`)
}

for (const method of ['POST', 'PUT', 'DELETE']) {
  const request = route('/app', method)
  assert.equal(request.uri, '/app', `${method} /app should pass through without an app-shell rewrite`)
}

for (const uri of ['/', '/assets/index.js', '/env.js', '/favicon.svg', '/manifest.webmanifest']) {
  const request = route(uri)
  assert.equal(request.uri, uri, `${uri} should pass through unchanged`)
}

console.log('Static SPA router validation passed.')
