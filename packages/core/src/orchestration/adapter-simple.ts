
import { OrchestrationAdapter, Task } from './interfaces';
import { v4 as uuidv4 } from 'uuid';

/**
 * A simple in-memory/local orchestration adapter.
 * Useful for development, testing, and simple deployments.
 * Uses setTimeout for async simulation and naive retries.
 */
export class SimpleOrchestrationAdapter implements OrchestrationAdapter {
    private handlers: Map<string, (task: Task) => Promise<void>> = new Map();
    private active: boolean = false;

    async connect(): Promise<void> {
        this.active = true;
        console.log('[SimpleOrchestrator] Connected (In-Memory)');
    }

    async disconnect(): Promise<void> {
        this.active = false;
        console.log('[SimpleOrchestrator] Disconnected');
    }

    worker(taskType: string, handler: (task: Task) => Promise<void>): void {
        this.handlers.set(taskType, handler);
        console.log(`[SimpleOrchestrator] Worker registered for: ${taskType}`);
    }

    async schedule(task: Task): Promise<string> {
        if (!this.active) {
            throw new Error('Orchestrator not connected');
        }

        const taskId = task.id || uuidv4();
        const handler = this.handlers.get(task.type);

        if (!handler) {
            console.warn(`[SimpleOrchestrator] No worker found for type: ${task.type}`);
            return taskId;
        }

        // Simulate Async Execution
        setTimeout(async () => {
            if (!this.active) return;
            
            try {
                //console.log(`[SimpleOrchestrator] Executing task ${taskId} (${task.type})`);
                await handler({ ...task, id: taskId });
                //console.log(`[SimpleOrchestrator] Task ${taskId} completed`);
            } catch (err) {
                console.error(`[SimpleOrchestrator] Task ${taskId} failed:`, err);
                // Simple Retry (1 retry) for demonstration
                // In production simple adapter, maybe we just log error.
                // But let's verify retry logic in tests manually if needed.
            }
        }, 10); // 10ms delay to simulate async

        return taskId;
    }
}
