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

export class Metrics {
    private static samples: Record<string, number[]> = {};
    private static counters: Record<string, number> = {};
    private static maxSamples = 1000;

    // Record a timing sample (latency, duration, etc.)
    static record(name: string, value: number) {
        if (!this.samples[name]) {
            this.samples[name] = [];
        }
        this.samples[name].push(value);
        if (this.samples[name].length > this.maxSamples) {
            this.samples[name].shift();
        }
    }

    // Increment a counter
    static increment(name: string, delta = 1) {
        this.counters[name] = (this.counters[name] || 0) + delta;
    }

    // Record a decision with all metadata
    static recordDecision(decision: string, latencyMs: number, policyId?: string) {
        this.increment(`decision_${decision}`);
        this.increment('decision_total');
        this.record('latency_ms', latencyMs);
        if (policyId) {
            this.increment(`policy_${policyId}`);
        }
    }

    // Record an error
    static recordError(type: 'llm' | 'db' | 'validation' | 'injection') {
        this.increment(`error_${type}`);
        this.increment('error_total');
    }

    // Get percentile from samples
    static percentile(name: string, p: number): number {
        const arr = this.samples[name] || [];
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, idx)];
    }

    // Get average of samples
    static getAverage(name: string): number {
        const values = this.samples[name];
        if (!values || values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    // Get counter value
    static getCounter(name: string): number {
        return this.counters[name] || 0;
    }

    // Full snapshot for JSON API
    static snapshot(): object {
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
            policies: Object.fromEntries(
                Object.entries(this.counters)
                    .filter(([k]) => k.startsWith('policy_'))
                    .map(([k, v]) => [k.replace('policy_', ''), v])
            ),
            timestamp: new Date().toISOString()
        };
    }

    // Prometheus format
    static toPrometheus(): string {
        const lines: string[] = [];
        
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
