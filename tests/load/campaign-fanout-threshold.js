import http from 'k6/http'
import { check, sleep } from 'k6'

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:8081'
const recipients = Number(__ENV.RECIPIENTS || '250')
const vus = Number(__ENV.VUS || '1')
const iterations = Number(__ENV.ITERATIONS || '1')

export const options = {
  scenarios: {
    campaign_fanout: {
      executor: 'shared-iterations',
      vus,
      iterations,
      maxDuration: __ENV.MAX_DURATION || '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<5000'],
  },
}

function phoneNumber(iteration, index) {
  return `+1555${String(iteration).padStart(4, '0')}${String(index).padStart(4, '0')}`
}

export default function () {
  const iteration = __VU * 100000 + __ITER
  const payload = {
    name: `fanout-threshold-${iteration}`,
    body: 'k6 fan-out threshold probe',
    recipients: Array.from({ length: recipients }, (_, index) => phoneNumber(iteration, index)),
  }

  const response = http.post(`${baseUrl}/campaigns`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'X-Company-Id': __ENV.COMPANY_ID || 'demo-company',
    },
    timeout: __ENV.REQUEST_TIMEOUT || '30s',
  })

  check(response, {
    'campaign created': (res) => res.status === 201,
    'message count matches requested fan-out': (res) => {
      try {
        return res.json('message_count') === recipients
      } catch (_) {
        return false
      }
    },
  })

  sleep(Number(__ENV.SLEEP_SECONDS || '1'))
}

