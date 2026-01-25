# Cloudflare D1 Limits & Scaling Strategy

> **Reference:** https://developers.cloudflare.com/d1/platform/limits/

## Current Limits (Jan 2026)

| Limit | Free | Pro | Enterprise |
|-------|------|-----|------------|
| Max DB Size | 5 GB | 10 GB | Custom |
| Max Databases | 10 | 50 | Custom |
| Row Reads/day | 5M | Unlimited | Unlimited |
| Row Writes/day | 100K | Unlimited | Unlimited |
| Max Query Size | 100 KB | 100 KB | 100 KB |
| Max Bound Params | 100 | 100 | 100 |

## Architectural Constraints

### Single Durable Object per DB

Each D1 database is backed by a **single Durable Object**, which means:

- **No horizontal read scaling** — all queries go to one instance
- **Geographic affinity** — DB lives in one region
- **Latency implications** — cross-region requests add RTT

### Write Throughput

D1 uses SQLite under the hood, which has:

- **Single-writer model** — writes are serialized
- **~100-500 writes/second** typical throughput
- **Batching recommended** for bulk operations

## ABS Implications

### Decision Log Growth

| Metric | Calculation | Result |
|--------|-------------|--------|
| Average decision log | ~1 KB | — |
| Max rows (10 GB) | 10 GB / 1 KB | ~10M decisions |
| At 100 decisions/hour | 10M / 100 / 24 | ~4.1 years |
| At 1000 decisions/hour | 10M / 1000 / 24 | ~416 days |

**Recommendation:** For high-volume tenants, implement DB rotation or migrate to PostgreSQL.

### Multi-Tenant Strategy

```
Option 1: Single DB (Small Scale)
├── All tenants in one DB
├── tenant_id column for isolation
└── Simple, but doesn't scale

Option 2: DB per Tenant (Recommended)
├── Each tenant gets own D1 database
├── Horizontal scaling by adding DBs
├── Tenant routing in application layer
└── Requires tenant → DB mapping

Option 3: Sharded DBs (High Scale)
├── Multiple DBs per tenant (by time/volume)
├── Shard key: tenant_id + date_bucket
├── Complex queries require aggregation
└── Best for >1M decisions/tenant
```

## Migration Path to PostgreSQL

### Why Migrate?

| D1 | PostgreSQL |
|----|------------|
| Single-region | Multi-region replicas |
| Single-writer | Connection pooling (100s of concurrent writers) |
| SQLite dialect | Standard SQL + extensions |
| Cloudflare-only | Cloud-agnostic |

### How to Migrate

1. **Abstract via `StorageAdapter`** (✅ Implemented)
   ```typescript
   // Current: D1StorageAdapter
   // Future: PostgresStorageAdapter
   ```

2. **Implement `PostgresStorageAdapter`**
   - Use Hyperdrive (Cloudflare) or direct connection
   - Connection pooling via PgBouncer

3. **Data Migration**
   - Export from D1: `wrangler d1 export`
   - Transform to pg format
   - Import via `pg_restore` or COPY

4. **Read Replicas for Scale**
   - Primary for writes
   - Replicas for read-heavy queries (dashboard, audit)

## Capacity Monitoring

### Alerts to Implement

```typescript
// In StorageAdapter health check
const capacity = await adapter.getCapacity();

if (capacity.usagePercent > 80) {
  alert('D1_CAPACITY_WARNING', { usage: capacity.usagePercent });
}

if (capacity.usagePercent > 95) {
  alert('D1_CAPACITY_CRITICAL', { usage: capacity.usagePercent });
}
```

### Dashboard Metrics

- `abs.storage.used_bytes` — Current usage
- `abs.storage.usage_percent` — Percentage of limit
- `abs.storage.rows_total` — Total rows stored
- `abs.storage.writes_per_minute` — Write throughput

## Best Practices

1. **Prune old data** — Archive decisions > 90 days to cold storage (R2)
2. **Batch inserts** — Group related writes in transactions
3. **Index wisely** — D1 has limited index storage
4. **Monitor capacity** — Alert at 80% usage
5. **Plan migration** — Start PostgreSQL adapter before hitting limits
