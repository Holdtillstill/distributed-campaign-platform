const WEB_BASE = normalizeBase(process.env.WEB_BASE || process.env.SITE_URL || 'https://distributed-campaign-platform.bozhi.dev')
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 15000)

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
      status: response.status,
    }
  } finally {
    clearTimeout(timeout)
  }
}

function isAppShell({ body, contentType, status }) {
  return status === 200 && contentType.toLowerCase().includes('text/html') && body.includes('<div id="root"></div>')
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
  if (!result.body.includes(expectedText)) {
    throw new Error(`${route} should include expected public copy: ${expectedText}`)
  }
  if (!result.body.includes('https://on-demand-demos.bozhi.dev/visitor.js')) {
    throw new Error(`${route} should include the first-party visitor script`)
  }
  if (!result.body.includes('data-project="distributed-campaign-platform"')) {
    throw new Error(`${route} should tag visitor events with the distributed-campaign-platform project id`)
  }
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
