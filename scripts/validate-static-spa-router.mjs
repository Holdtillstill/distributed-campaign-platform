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

function respond(uri = '/') {
  const context = {
    event: {
      request: {
        method: 'GET',
        uri,
        headers: {},
      },
      response: {
        statusCode: 200,
        statusDescription: 'OK',
        headers: {
          'content-type': { value: 'text/html' },
          'content-security-policy': { value: "default-src 'self'; script-src 'self'" },
        },
      },
    },
  }
  return vm.runInNewContext(`${source}\nhandler(event);`, context)
}

function assertSecurityHeaders(response) {
  const headers = response.headers
  const csp = headers['content-security-policy']?.value || ''

  assert.match(csp, /default-src 'self'/)
  assert.ok(csp.includes("base-uri 'self'"))
  assert.ok(csp.includes("connect-src 'self' https://on-demand-demos.bozhi.dev https://fonts.googleapis.com"))
  assert.ok(csp.includes("frame-ancestors 'none'"))
  assert.ok(csp.includes("img-src 'self' data: https://platform-academy.bozhi.dev https://images.unsplash.com"))
  assert.ok(csp.includes("script-src 'self' https://on-demand-demos.bozhi.dev"))
  assert.ok(csp.includes("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"))
  assert.ok(csp.includes('upgrade-insecure-requests'))
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/)

  assert.match(headers['strict-transport-security']?.value || '', /max-age=31536000/)
  assert.equal(headers['x-content-type-options']?.value, 'nosniff')
  assert.equal(headers['x-frame-options']?.value, 'DENY')
  assert.equal(headers['referrer-policy']?.value, 'strict-origin-when-cross-origin')
  assert.equal(headers['cross-origin-opener-policy']?.value, 'same-origin')
  assert.match(headers['permissions-policy']?.value || '', /camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\)/)
}

for (const uri of ['/api', '/api/health', '/api/healthz', '/api/me/memberships', '/r/campaign-link']) {
  const response = route(uri)
  assert.equal(response.statusCode, 404, `${uri} should return an edge 404`)
  assert.equal(response.headers['content-type'].value, 'application/json')
  assertSecurityHeaders(response)
  assert.match(response.body, /Campaign API/)
}

for (const uri of [
  '/app',
  '/app/dashboard',
  '/app/campaigns/scheduled',
  '/app/campaigns/follow-ups',
  '/app/subscribers',
  '/app/analytics',
  '/monitor',
  '/features/broadcast-monitor',
  '/kb/articles',
  '/internal/dashboard',
]) {
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

assertSecurityHeaders(respond('/'))

console.log('Static SPA router validation passed.')
