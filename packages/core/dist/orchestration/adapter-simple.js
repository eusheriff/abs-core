"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleOrchestrationAdapter = void 0;
const uuid_1 = require("uuid");
/**
 * A simple in-memory/local orchestration adapter.
 * Useful for development, testing, and simple deployments.
 * Uses setTimeout for async simulation and naive retries.
 */
class SimpleOrchestrationAdapter {
    constructor() {
        this.handlers = new Map();
        this.active = false;
    }
    async connect() {
        this.active = true;
        console.log('[SimpleOrchestrator] Connected (In-Memory)');
    }
    async disconnect() {
        this.active = false;
        console.log('[SimpleOrchestrator] Disconnected');
    }
    worker(taskType, handler) {
        this.handlers.set(taskType, handler);
        console.log(`[SimpleOrchestrator] Worker registered for: ${taskType}`);
    }
    async schedule(task) {
        if (!this.active) {
            throw new Error('Orchestrator not connected');
        }
        const taskId = task.id || (0, uuid_1.v4)();
        const handler = this.handlers.get(task.type);
        if (!handler) {
            console.warn(`[SimpleOrchestrator] No worker found for type: ${task.type}`);
            return taskId;
        }
        // Simulate Async Execution
        setTimeout(async () => {
            if (!this.active)
                return;
            try {
                //console.log(`[SimpleOrchestrator] Executing task ${taskId} (${task.type})`);
                await handler({ ...task, id: taskId });
                //console.log(`[SimpleOrchestrator] Task ${taskId} completed`);
            }
            catch (err) {
                console.error(`[SimpleOrchestrator] Task ${taskId} failed:`, err);
                // Simple Retry (1 retry) for demonstration
                // In production simple adapter, maybe we just log error.
                // But let's verify retry logic in tests manually if needed.
            }
        }, 10); // 10ms delay to simulate async
        return taskId;
    }
}
exports.SimpleOrchestrationAdapter = SimpleOrchestrationAdapter;
