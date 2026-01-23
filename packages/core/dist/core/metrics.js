"use strict";
/**
 * ABS Core Enhanced Metrics
 *
 * Provides enterprise observability:
 * - Decision counts (allow, deny, escalate, handoff)
 * - Latency percentiles (p50, p95, p99)
 * - Policy hit rates
 * - Error tracking
 * - Prometheus format export
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Metrics = void 0;
class Metrics {
    // Record a timing sample (latency, duration, etc.)
    static record(name, value) {
        if (!this.samples[name]) {
            this.samples[name] = [];
        }
        this.samples[name].push(value);
        if (this.samples[name].length > this.maxSamples) {
            this.samples[name].shift();
        }
    }
    // Increment a counter
    static increment(name, delta = 1) {
        this.counters[name] = (this.counters[name] || 0) + delta;
    }
    // Record a decision with all metadata
    static recordDecision(decision, latencyMs, policyId) {
        this.increment(`decision_${decision}`);
        this.increment('decision_total');
        this.record('latency_ms', latencyMs);
        if (policyId) {
            this.increment(`policy_${policyId}`);
        }
    }
    // Record an error
    static recordError(type) {
        this.increment(`error_${type}`);
        this.increment('error_total');
    }
    // Get percentile from samples
    static percentile(name, p) {
        const arr = this.samples[name] || [];
        if (arr.length === 0)
            return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, idx)];
    }
    // Get average of samples
    static getAverage(name) {
        const values = this.samples[name];
        if (!values || values.length === 0)
            return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    // Get counter value
    static getCounter(name) {
        return this.counters[name] || 0;
    }
    // Full snapshot for JSON API
    static snapshot() {
        return {
            decisions: {
                allow: this.getCounter('decision_allow'),
                deny: this.getCounter('decision_deny'),
                escalate: this.getCounter('decision_escalate'),
                handoff: this.getCounter('decision_handoff'),
                total: this.getCounter('decision_total')
            },
            latency: {
                samples: (this.samples['latency_ms'] || []).length,
                avg: Math.round(this.getAverage('latency_ms') * 100) / 100,
                p50: this.percentile('latency_ms', 50),
                p95: this.percentile('latency_ms', 95),
                p99: this.percentile('latency_ms', 99)
            },
            errors: {
                llm: this.getCounter('error_llm'),
                db: this.getCounter('error_db'),
                validation: this.getCounter('error_validation'),
                injection: this.getCounter('error_injection'),
                total: this.getCounter('error_total')
            },
            policies: Object.fromEntries(Object.entries(this.counters)
                .filter(([k]) => k.startsWith('policy_'))
                .map(([k, v]) => [k.replace('policy_', ''), v])),
            timestamp: new Date().toISOString()
        };
    }
    // Prometheus format
    static toPrometheus() {
        const lines = [];
        // Decisions
        lines.push('# HELP abs_decisions_total Governance decisions by result');
        lines.push('# TYPE abs_decisions_total counter');
        for (const result of ['allow', 'deny', 'escalate', 'handoff']) {
            lines.push(`abs_decisions_total{result="${result}"} ${this.getCounter(`decision_${result}`)}`);
        }
        // Latency
        lines.push('# HELP abs_latency_ms Decision latency in milliseconds');
        lines.push('# TYPE abs_latency_ms summary');
        lines.push(`abs_latency_ms{quantile="0.5"} ${this.percentile('latency_ms', 50)}`);
        lines.push(`abs_latency_ms{quantile="0.95"} ${this.percentile('latency_ms', 95)}`);
        lines.push(`abs_latency_ms{quantile="0.99"} ${this.percentile('latency_ms', 99)}`);
        lines.push(`abs_latency_ms_count ${(this.samples['latency_ms'] || []).length}`);
        // Errors
        lines.push('# HELP abs_errors_total Errors by type');
        lines.push('# TYPE abs_errors_total counter');
        for (const type of ['llm', 'db', 'validation', 'injection']) {
            lines.push(`abs_errors_total{type="${type}"} ${this.getCounter(`error_${type}`)}`);
        }
        return lines.join('\n');
    }
    // Reset all metrics (useful for testing)
    static reset() {
        this.samples = {};
        this.counters = {};
    }
}
exports.Metrics = Metrics;
Metrics.samples = {};
Metrics.counters = {};
Metrics.maxSamples = 1000;
