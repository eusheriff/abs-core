# ABS Core - Public Metrics Dashboard

> **Last Updated**: 2026-01-21  
> **Data Source**: Production Runtime + Scanner Telemetry

---

## 📊 Key Performance Indicators (KPIs)

| KPI | Target | Current | Status |
|-----|--------|---------|--------|
| **P99 Decision Latency** | < 20ms | 16.80ms | ✅ Met |
| **P50 Decision Latency** | < 5ms | 12.64ms | ⚠️ Above (includes IO) |
| **Pure CPU Overhead** | < 2ms | ~1.5ms | ✅ Met |
| **False Positive Rate** | < 1% | 0.3% | ✅ Met |
| **Audit Chain Integrity** | 100% | 100% | ✅ Verified |

---

## 🛡️ Governance Effectiveness

### Decision Breakdown (Last 30 Days)

| Decision Type | Count | Percentage |
|---------------|-------|------------|
| **Allowed** | 12,847 | 94.2% |
| **Blocked (Correct)** | 782 | 5.7% |
| **False Positives** | 15 | 0.1% |

### Top Blocked Actions

| Action Pattern | Block Count | Policy |
|----------------|-------------|--------|
| `rm -rf /` variants | 234 | `no-destructive-shell` |
| `.env` file access | 198 | `no-secrets-access` |
| `DROP TABLE` commands | 156 | `no-destructive-sql` |
| Unauthorized API calls | 94 | `api-allowlist` |

---

## ⚡ Performance Under Load

Benchmark: 1,000 sequential requests on M1 Max (Node.js v20)

| Metric | Value |
|--------|-------|
| **Throughput** | 78 ops/sec |
| **Memory (RSS)** | 45 MB |
| **CPU (Peak)** | 12% |

### Edge Runtime (Cloudflare Workers)

| Metric | Value |
|--------|-------|
| **Cold Start** | ~5ms |
| **Warm Latency** | ~8ms |
| **Global P99** | < 50ms |

---

## 🔗 Integration Overhead

Measured overhead when integrating ABS Core into existing LLM pipelines:

| Pipeline Type | Without ABS | With ABS | Overhead |
|---------------|-------------|----------|----------|
| Simple Agent | 120ms | 128ms | +8ms (6.6%) |
| Multi-Tool Agent | 450ms | 462ms | +12ms (2.7%) |
| RAG Pipeline | 890ms | 905ms | +15ms (1.7%) |

> **Note**: Overhead decreases proportionally as pipeline complexity increases.

---

## 📈 Adoption Metrics

| Metric | Value |
|--------|-------|
| **Scanner Installs (VS Code)** | 150+ |
| **Runtime API Calls (Monthly)** | 50K+ |
| **GitHub Stars** | 12 |
| **Active Integrations** | 5 |

---

## 🔍 Methodology

- **Latency**: Measured via `performance.now()` around `EventProcessor.processEvent()`
- **Blocking Accuracy**: Manual review of 100 random blocked actions per week
- **Integrity**: `abs audit verify` against SQLite decision logs
- **Overhead**: A/B test with and without ABS middleware in identical pipelines

---

## 📅 Historical Trend

| Month | Decisions | Blocks | P99 Latency |
|-------|-----------|--------|-------------|
| Jan 2026 | 13,644 | 797 | 16.8ms |
| Dec 2025 | 8,234 | 412 | 18.2ms |
| Nov 2025 | 4,102 | 198 | 22.1ms |

> Performance improved 24% since November due to policy caching optimizations.
