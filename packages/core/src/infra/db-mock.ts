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

    async run(query: string, ...params: any[]): Promise<{ isSuccess: boolean }> {
        if (query.includes('INSERT INTO decision_logs')) {
             // Mock the insert structure (12 params from processor.ts)
             //  0: decision_id, 1: tenant_id, 2: event_id, 3: policy, 4: provider, 5: decision
             //  6: risk_score, 7: status, 8: response, 9: full_log_json, 10: timestamp, 11: signature
             this.logs.push({
                 decision_id: params[0],
                 tenant_id: params[1],
                 event_id: params[2],
                 policy_name: params[3],
                 provider: params[4],
                 decision: params[5],
                 risk_score: params[6],
                 execution_status: params[7],
                 execution_response: params[8],
                 full_log_json: params[9],
                 timestamp: params[10],
                 signature: params[11]
             });
        }
        return Promise.resolve({ isSuccess: true });
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
