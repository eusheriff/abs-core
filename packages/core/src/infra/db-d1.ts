import { DatabaseAdapter } from './db-adapter';

// Cloudflare D1 Type Definition Stub
interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<any>;
}
interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    run(): Promise<{ success: boolean }>;
    all<T = any>(): Promise<{ results: T[] }>;
}

export class D1Adapter implements DatabaseAdapter {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    async init(): Promise<void> {
        // D1 is lazy loaded by Cloudflare, no init needed
        return Promise.resolve();
    }

    async exec(query: string): Promise<void> {
        await this.db.exec(query);
    }

    async run(query: string, ...params: any[]): Promise<{ isSuccess: boolean }> {
        const stmt = this.db.prepare(query).bind(...params);
        const result = await stmt.run();
        return { isSuccess: result.success };
    }

    async all<T = any>(query: string, ...params: any[]): Promise<T[]> {
        const stmt = this.db.prepare(query).bind(...params);
        const result = await stmt.all<T>();
        return result.results;
    }
}
