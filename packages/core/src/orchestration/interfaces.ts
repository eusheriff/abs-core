
export interface Task {
    id: string;
    type: string;
    payload: any;
    metadata?: Record<string, any>;
    priority?: number; // 0-100
}

export interface OrchestrationAdapter {
    /**
     * Schedule a task for execution.
     * @returns task_id
     */
    schedule(task: Task): Promise<string>;

    /**
     * Register a worker to handle a specific task type.
     */
    worker(taskType: string, handler: (task: Task) => Promise<void>): void;

    /**
     * Initialize connection to orchestrator.
     */
    connect(): Promise<void>;

    /**
     * Graceful shutdown.
     */
    disconnect(): Promise<void>;
}
