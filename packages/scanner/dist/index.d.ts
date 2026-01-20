export interface ABSEvent {
    input?: string;
    output?: string;
    model?: string;
    metadata?: Record<string, any>;
    tenant_id?: string;
}
export interface ABSConfig {
    dsn: string;
    apiKey?: string;
    scannerMode?: boolean;
}
export declare class ABS {
    private static config;
    static init(config: ABSConfig): void;
    static log(event: ABSEvent): Promise<void>;
}
