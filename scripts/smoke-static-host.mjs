const WEB_BASE = normalizeBase(process.env.WEB_BASE || process.env.SITE_URL || 'https://distributed-campaign-platform.bozhi.dev')
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 15000)
const EXPECT_SECURITY_HEADERS = process.env.SMOKE_EXPECT_SECURITY_HEADERS !== 'false'

function normalizeBase(value) {
  return value.replace(/\/+$/, '')
}

async function fetchText(path, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${WEB_BASE}${path}`, {
      ...options,
      signal: controller.signal,
    })
    return {
      body: await response.text(),
      contentType: response.headers.get('content-type') || '',
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
    }
  } finally {
    clearTimeout(timeout)
  }
}

function isAppShell({ body, contentType, status }) {
  return status === 200 && contentType.toLowerCase().includes('text/html') && body.includes('<div id="root"></div>')
}

function requireHeader(headers, name, expected) {
  const value = headers[name.toLowerCase()] || ''
  if (!value) throw new Error(`Expected ${name} security header on ${WEB_BASE}`)
  if (expected instanceof RegExp && !expected.test(value)) {
    throw new Error(`Expected ${name} to match ${expected}, got "${value}"`)
  }
  if (typeof expected === 'string' && value !== expected) {
    throw new Error(`Expected ${name} to be "${expected}", got "${value}"`)
  }
  return value
}

function assertSecurityHeaders(result) {
  if (!EXPECT_SECURITY_HEADERS) return

  const csp = requireHeader(result.headers, 'content-security-policy', /default-src 'self'/)
  for (const requiredDirective of [
    "base-uri 'self'",
    "connect-src 'self' https://on-demand-demos.bozhi.dev",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' https://on-demand-demos.bozhi.dev",
    'upgrade-insecure-requests',
  ]) {
    if (!csp.includes(requiredDirective)) throw new Error(`CSP should include ${requiredDirective}`)
  }
  if (/script-src[^;]*'unsafe-inline'/.test(csp)) {
    throw new Error("CSP script-src should not allow unsafe-inline")
  }

  requireHeader(result.headers, 'strict-transport-security', /max-age=31536000/)
  requireHeader(result.headers, 'x-content-type-options', 'nosniff')
  requireHeader(result.headers, 'x-frame-options', 'DENY')
  requireHeader(result.headers, 'referrer-policy', 'strict-origin-when-cross-origin')
}

const htmlRoutes = [
  ['/', 'CampaignOS'],
  ['/app', 'CampaignOS'],
  ['/app/dashboard', 'CampaignOS'],
  ['/app/campaigns/scheduled', 'CampaignOS'],
  ['/app/campaigns/follow-ups', 'CampaignOS'],
  ['/app/subscribers', 'CampaignOS'],
  ['/app/analytics', 'CampaignOS'],
  ['/monitor', 'CampaignOS'],
  ['/internal/dashboard', 'CampaignOS'],
  ['/features', 'CampaignOS'],
  ['/features/broadcast-monitor', 'CampaignOS'],
  ['/kb', 'CampaignOS'],
  ['/kb/articles', 'CampaignOS'],
]
for (const [route, expectedText] of htmlRoutes) {
  const result = await fetchText(route)
  if (result.status !== 200 || !result.contentType.toLowerCase().includes('text/html')) {
    throw new Error(`${route} should serve the public web app, got ${result.status} ${result.contentType}`)
  }
  if (route !== '/') {
    const cacheHeader = result.headers['x-cache'] || ''
    if (/error from cloudfront/i.test(cacheHeader)) {
      throw new Error(`${route} should use clean CloudFront routing, got x-cache="${cacheHeader}"`)
    }
  }
  if (!result.body.includes(expectedText)) {
    throw new Error(`${route} should include expected public copy: ${expectedText}`)
  }
  if (!result.body.includes('https://on-demand-demos.bozhi.dev/visitor.js')) {
    throw new Error(`${route} should include the first-party visitor script`)
  }
  if (!result.body.includes('data-project="distributed-campaign-platform"')) {
    throw new Error(`${route} should tag visitor events with the distributed-campaign-platform project id`)
  }
  if (route === '/') assertSecurityHeaders(result)
}

for (const route of ['/api/health', '/api/healthz', '/api/me/memberships', '/r/static-host-smoke']) {
  const result = await fetchText(route, {
    headers: {
      accept: 'application/json',
    },
  })
  if (result.status !== 404 || !result.contentType.toLowerCase().includes('application/json')) {
    throw new Error(`${route} should return a JSON 404 on the static host, got ${result.status} ${result.contentType}`)
  }
  if (isAppShell(result)) {
    throw new Error(`${route} returned the HTML app shell. Static hosting must reject or proxy API routes instead.`)
  }
  if (!result.body.includes('Campaign API')) {
    throw new Error(`${route} JSON 404 should explain that the static host is not connected to the Campaign API.`)
  }
}

console.log(`Static host smoke passed for ${WEB_BASE}.`)
