export interface ABSEvent {
    input: string;
    output: string;
    policy?: string;
    model?: string;
    metadata?: Record<string, any>;
    tenant_id?: string;
}
export interface ABSConfig {
    dsn?: string;
    apiKey?: string;
    mode?: 'scanner' | 'runtime';
    debug?: boolean;
}
export declare class ABS {
    private config;
    constructor(config?: ABSConfig);
    log(event: ABSEvent): Promise<void>;
}
