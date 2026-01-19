import { DatabaseAdapter } from './db-adapter';

export class MockDBAdapter implements DatabaseAdapter {
    public logs: any[] = [];

    async init(): Promise<void> {
        this.logs = [];
        return Promise.resolve();
    }

    async exec(query: string): Promise<void> {
        // No-op for schema init
        return Promise.resolve();
    }

    async run(query: string, ...params: any[]): Promise<{ success: boolean }> {
        if (query.includes('INSERT INTO decision_logs')) {
             // Mock the insert structure
             // params: decision_id, tenant_id, event_id, correlation_id, timestamp, full_log_json
             this.logs.push({
                 decision_id: params[0],
                 tenant_id: params[1],
                 event_id: params[2],
                 correlation_id: params[3],
                 timestamp: params[4],
                 full_log_json: params[5]
             });
        }
        return Promise.resolve({ success: true });
    }

    async all<T = any>(query: string, ...params: any[]): Promise<T[]> {
        if (query.includes('SELECT * FROM decision_logs')) {
            const eventId = params[0];
            return this.logs.filter(l => l.event_id === eventId) as any as T[];
        }
        if (query.includes('count(*)')) {
            return [{ c: this.logs.length }] as any;
        }
        return [];
    }
}
