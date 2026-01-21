import { EventProcessor } from '../src/core/processor';
import { LocalDBAdapter } from '../src/infra/db-local';
import { PolicyRegistry } from '../src/core/policy-registry';
import { v4 as uuidv4 } from 'uuid';

async function runBenchmark() {
    console.log("🚀 Starting ABS Core Micro-Benchmark...");

    // 1. Setup (File DB to persist for verification)
    const db = new LocalDBAdapter('benchmark.db');
    await db.init();
    
    // Mock Policy
    PolicyRegistry.register('benchmark', {
        name: 'benchmark-policy',
        description: 'Fast policy',
        evaluate: (event) => {
            if (event.payload?.harmful) return { decision: 'DENY', score: 100 };
            return { decision: 'ALLOW', score: 0 };
        }
    });

    const processor = new EventProcessor(db, { llmProvider: 'mock' });

    // 2. Warmup
    console.log("🔥 Warming up...");
    for (let i = 0; i < 100; i++) {
        await processor.process(createEvent());
    }

    // 3. Execution
    const ITERATIONS = 1000;
    const latencies: number[] = [];
    
    console.log(`⚡ Running ${ITERATIONS} iterations...`);
    const startTotal = performance.now();

    for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        await processor.process(createEvent());
        const end = performance.now();
        latencies.push(end - start);
    }

    const endTotal = performance.now();

    // 4. Analysis
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(ITERATIONS * 0.5)];
    const p95 = latencies[Math.floor(ITERATIONS * 0.95)];
    const p99 = latencies[Math.floor(ITERATIONS * 0.99)];
    const totalTime = endTotal - startTotal;
    const throughput = (ITERATIONS / totalTime) * 1000;

    console.log("\n📊 Results:");
    console.log(`- Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`- Throughput: ${throughput.toFixed(2)} ops/sec`);
    console.log(`- P50 Latency: ${p50.toFixed(3)}ms`);
    console.log(`- P95 Latency: ${p95.toFixed(3)}ms`);
    console.log(`- P99 Latency: ${p99.toFixed(3)}ms`);

    if (p99 > 20) {
        console.warn("⚠️ P99 exceeds 20ms SLO!");
    } else {
        console.log("✅ All SLOs met.");
    }
}

function createEvent() {
    return {
        event_id: uuidv4(),
        event_type: 'benchmark.test',
        source: 'benchmark',
        tenant_id: 'default',
        correlation_id: uuidv4(),
        occurred_at: new Date().toISOString(),
        payload: { command: 'ls -la', safe: true }
    };
}

runBenchmark().catch(console.error);
