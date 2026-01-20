/**
 * ABS Core Load Testing Script
 * 
 * Usage:
 *   npx tsx scripts/load-test.ts --requests 100 --concurrency 10
 * 
 * Environment:
 *   ABS_API_URL - Target URL (default: http://localhost:8787)
 *   ABS_API_KEY - API key (default: test-key)
 */

const API_URL = process.env.ABS_API_URL || 'http://localhost:8787';
const API_KEY = process.env.ABS_API_KEY || 'test-key';

interface TestResult {
    success: number;
    failed: number;
    latencies: number[];
    errors: string[];
}

async function sendEvent(eventId: string): Promise<{ success: boolean; latency: number; error?: string }> {
    const start = Date.now();
    
    try {
        const response = await fetch(`${API_URL}/v1/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                event_id: eventId,
                tenant_id: 'load-test',
                event_type: 'test.load',
                source: 'load-test-script',
                occurred_at: new Date().toISOString(),
                payload: { test: true, timestamp: Date.now() },
                correlation_id: `load-${eventId}`
            })
        });

        const latency = Date.now() - start;
        
        if (!response.ok) {
            const text = await response.text();
            return { success: false, latency, error: `${response.status}: ${text}` };
        }

        return { success: true, latency };
    } catch (error: any) {
        return { success: false, latency: Date.now() - start, error: error.message };
    }
}

async function runLoadTest(requests: number, concurrency: number): Promise<void> {
    console.log(`\n🚀 ABS Core Load Test`);
    console.log(`   Target: ${API_URL}`);
    console.log(`   Requests: ${requests}`);
    console.log(`   Concurrency: ${concurrency}\n`);

    const result: TestResult = {
        success: 0,
        failed: 0,
        latencies: [],
        errors: []
    };

    const startTime = Date.now();
    const batches = Math.ceil(requests / concurrency);

    for (let batch = 0; batch < batches; batch++) {
        const batchSize = Math.min(concurrency, requests - batch * concurrency);
        const promises: Promise<{ success: boolean; latency: number; error?: string }>[] = [];

        for (let i = 0; i < batchSize; i++) {
            const eventId = `load-${batch}-${i}-${Date.now()}`;
            promises.push(sendEvent(eventId));
        }

        const results = await Promise.all(promises);
        
        for (const r of results) {
            if (r.success) {
                result.success++;
                result.latencies.push(r.latency);
            } else {
                result.failed++;
                if (r.error) result.errors.push(r.error);
            }
        }

        // Progress indicator
        const progress = Math.round(((batch + 1) / batches) * 100);
        process.stdout.write(`\r   Progress: ${progress}%`);
    }

    const totalTime = Date.now() - startTime;

    // Calculate stats
    const sorted = result.latencies.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
    const avg = sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;

    console.log(`\n\n📊 Results:`);
    console.log(`   ✅ Success: ${result.success}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    console.log(`   📈 Success Rate: ${((result.success / requests) * 100).toFixed(1)}%`);
    console.log(`\n⏱️  Latency:`);
    console.log(`   Avg: ${avg.toFixed(0)}ms`);
    console.log(`   p50: ${p50}ms`);
    console.log(`   p95: ${p95}ms`);
    console.log(`   p99: ${p99}ms`);
    console.log(`\n🔄 Throughput: ${(requests / (totalTime / 1000)).toFixed(1)} req/s`);
    console.log(`   Total Time: ${(totalTime / 1000).toFixed(1)}s\n`);

    if (result.errors.length > 0) {
        console.log(`⚠️  Unique Errors:`);
        const unique = [...new Set(result.errors)];
        unique.slice(0, 5).forEach(e => console.log(`   - ${e}`));
    }
}

// CLI Args
const args = process.argv.slice(2);
let requests = 100;
let concurrency = 10;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--requests' && args[i + 1]) {
        requests = parseInt(args[i + 1], 10);
    }
    if (args[i] === '--concurrency' && args[i + 1]) {
        concurrency = parseInt(args[i + 1], 10);
    }
}

runLoadTest(requests, concurrency);
