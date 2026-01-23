"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.D1Adapter = void 0;
class D1Adapter {
    constructor(db) {
        this.db = db;
    }
    async init() {
        // D1 is lazy loaded by Cloudflare, no init needed
        return Promise.resolve();
    }
    async exec(query) {
        await this.db.exec(query);
    }
    async run(query, ...params) {
        const stmt = this.db.prepare(query).bind(...params);
        const result = await stmt.run();
        return { isSuccess: result.success };
    }
    async all(query, ...params) {
        const stmt = this.db.prepare(query).bind(...params);
        const result = await stmt.all();
        return result.results;
    }
}
exports.D1Adapter = D1Adapter;
