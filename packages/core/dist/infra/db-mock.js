"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockDBAdapter = void 0;
class MockDBAdapter {
    constructor() {
        this.logs = [];
    }
    async init() {
        this.logs = [];
        return Promise.resolve();
    }
    async exec(query) {
        // No-op for schema init
        return Promise.resolve();
    }
    async run(query, ...params) {
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
    async all(query, ...params) {
        if (query.includes('SELECT * FROM decision_logs')) {
            const eventId = params[0];
            return this.logs.filter(l => l.event_id === eventId);
        }
        if (query.includes('count(*)')) {
            return [{ c: this.logs.length }];
        }
        return [];
    }
}
exports.MockDBAdapter = MockDBAdapter;
