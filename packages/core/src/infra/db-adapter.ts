// Interface for both Local SQLite and Cloudflare D1
export interface DatabaseAdapter {
    exec(query: string): Promise<void>;
    run(query: string, ...params: any[]): Promise<{ isSuccess: boolean }>;
    all<T = any>(query: string, ...params: any[]): Promise<T[]>;
    // Setup helper
    init(): Promise<void>;
}
