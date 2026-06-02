# Load Tests

These probes are intentionally small by default. They are meant to reveal bottlenecks in the demo stack without accidentally launching an expensive or noisy benchmark.

## Campaign fan-out threshold

`campaign-fanout-threshold.js` creates campaigns with a configurable recipient count and measures how long the synchronous API fan-out path takes.

```bash
# Local API default: http://127.0.0.1:8081
k6 run tests/load/campaign-fanout-threshold.js

# Increase pressure gradually. Top up demo credits first if needed.
RECIPIENTS=1000 ITERATIONS=3 VUS=1 k6 run tests/load/campaign-fanout-threshold.js
```

Use this to support the architecture review: the current API request path is fine for a small portfolio demo, but very large broadcasts should move to a scheduler/fan-out worker that batches database writes and queue publishes outside the HTTP request.
