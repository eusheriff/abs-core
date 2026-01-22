import { ABSContext } from './context';

/**
 * Result of a runtime pack heartbeat check
 */
export interface HeartbeatResult {
  healthy: boolean;
  message?: string;
  lastCheck: Date;
  metrics?: {
    eventsProcessed?: number;
    errorsCount?: number;
    uptime?: number;
  };
}

/**
 * Definition of a tool exposed by a runtime pack
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
  handler: (input: unknown, ctx: ABSContext) => Promise<unknown>;
}

/**
 * Runtime Pack Interface
 * 
 * A Runtime Pack is a loadable module that extends ABS Core with
 * additional capabilities, tools, and enforcement logic.
 * 
 * Examples: Antigravity Runtime, Custom Enterprise Packs
 */
export interface RuntimePack {
  /** Unique name of the runtime pack */
  name: string;
  
  /** Semantic version */
  version: string;
  
  /**
   * Initialize the runtime pack
   * Called once when the MCP server starts
   */
  init(ctx: ABSContext): Promise<void>;
  
  /**
   * Graceful shutdown
   * Called when the MCP server is stopping
   */
  shutdown(): Promise<void>;
  
  /**
   * Health check / heartbeat
   * Called periodically by the scheduler
   */
  heartbeat(): Promise<HeartbeatResult>;
  
  /**
   * Get tools exposed by this pack
   * These are registered with the MCP server
   */
  getTools(): ToolDefinition[];
}

/**
 * Registry for managing runtime packs
 */
export class RuntimePackRegistry {
  private packs: Map<string, RuntimePack> = new Map();
  
  register(pack: RuntimePack): void {
    if (this.packs.has(pack.name)) {
      throw new Error(`Runtime pack '${pack.name}' already registered`);
    }
    this.packs.set(pack.name, pack);
  }
  
  get(name: string): RuntimePack | undefined {
    return this.packs.get(name);
  }
  
  getAll(): RuntimePack[] {
    return Array.from(this.packs.values());
  }
  
  async initializeAll(ctx: ABSContext): Promise<void> {
    for (const pack of this.packs.values()) {
      await pack.init(ctx);
    }
  }
  
  async shutdownAll(): Promise<void> {
    for (const pack of this.packs.values()) {
      await pack.shutdown();
    }
  }
  
  getAllTools(): ToolDefinition[] {
    return this.getAll().flatMap(pack => pack.getTools());
  }
}
