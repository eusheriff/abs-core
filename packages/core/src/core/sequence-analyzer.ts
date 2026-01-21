/**
 * Sequence Analyzer - Detects dangerous patterns across action chains
 * 
 * LLM agents can bypass static allow/deny rules by chaining individually
 * benign actions into dangerous sequences. This analyzer tracks recent
 * actions per agent and applies sequence-based risk scoring.
 * 
 * @example
 * // Individual actions might be allowed:
 * // 1. read_file(".env") -> ALLOW (reading is fine)
 * // 2. http_request() -> ALLOW (network is fine)
 * // But combined: read secrets + send externally = DATA EXFILTRATION
 */

export interface ActionRecord {
  eventType: string;
  timestamp: number;
  riskScore: number;
  payload?: Record<string, unknown>;
}

export interface AgentSequence {
  agentId: string;
  actions: ActionRecord[];
  cumulativeRisk: number;
  lastUpdated: number;
}

export interface SequencePattern {
  name: string;
  description: string;
  pattern: string[];        // Ordered event types to match
  riskBonus: number;        // Additional risk when pattern detected
  maxTimeWindowMs: number;  // Actions must occur within this window
}

// Built-in dangerous sequence patterns
const DANGEROUS_PATTERNS: SequencePattern[] = [
  {
    name: 'data-exfiltration',
    description: 'Reading sensitive files followed by external communication',
    pattern: ['file:read', 'http:request'],
    riskBonus: 40,
    maxTimeWindowMs: 60000, // 1 minute
  },
  {
    name: 'privilege-escalation',
    description: 'Multiple permission-related operations in sequence',
    pattern: ['auth:*', 'admin:*'],
    riskBonus: 50,
    maxTimeWindowMs: 30000,
  },
  {
    name: 'config-manipulation',
    description: 'Reading config followed by write operations',
    pattern: ['file:read', 'file:write'],
    riskBonus: 20,
    maxTimeWindowMs: 30000,
  },
  {
    name: 'destructive-sequence',
    description: 'Multiple destructive operations in sequence',
    pattern: ['db:delete', 'file:delete'],
    riskBonus: 60,
    maxTimeWindowMs: 60000,
  },
  {
    name: 'reconnaissance',
    description: 'Multiple read/list operations indicating scanning',
    pattern: ['file:list', 'file:list', 'file:read'],
    riskBonus: 15,
    maxTimeWindowMs: 120000,
  },
];

export class SequenceAnalyzer {
  private sequences: Map<string, AgentSequence> = new Map();
  private patterns: SequencePattern[];
  private maxHistorySize: number;
  private historyTTLMs: number;

  constructor(options: {
    customPatterns?: SequencePattern[];
    maxHistorySize?: number;
    historyTTLMs?: number;
  } = {}) {
    this.patterns = [...DANGEROUS_PATTERNS, ...(options.customPatterns || [])];
    this.maxHistorySize = options.maxHistorySize || 20;
    this.historyTTLMs = options.historyTTLMs || 300000; // 5 minutes default
  }

  /**
   * Record an action and analyze for dangerous sequences
   */
  analyze(agentId: string, action: ActionRecord): {
    sequenceRisk: number;
    matchedPatterns: string[];
    cumulativeRisk: number;
  } {
    // Get or create agent sequence
    let sequence = this.sequences.get(agentId);
    if (!sequence) {
      sequence = {
        agentId,
        actions: [],
        cumulativeRisk: 0,
        lastUpdated: Date.now(),
      };
      this.sequences.set(agentId, sequence);
    }

    // Add action to history
    sequence.actions.push(action);
    sequence.lastUpdated = Date.now();

    // Prune old actions
    this.pruneHistory(sequence);

    // Analyze for patterns
    const matchedPatterns: string[] = [];
    let sequenceRisk = 0;

    for (const pattern of this.patterns) {
      if (this.matchesPattern(sequence, pattern)) {
        matchedPatterns.push(pattern.name);
        sequenceRisk += pattern.riskBonus;
        console.log(`[SequenceAnalyzer] Detected pattern '${pattern.name}' for agent ${agentId}`);
      }
    }

    // Update cumulative risk with decay
    sequence.cumulativeRisk = this.calculateCumulativeRisk(sequence, sequenceRisk);

    return {
      sequenceRisk,
      matchedPatterns,
      cumulativeRisk: sequence.cumulativeRisk,
    };
  }

  /**
   * Check if sequence matches a pattern
   */
  private matchesPattern(sequence: AgentSequence, pattern: SequencePattern): boolean {
    const now = Date.now();
    const recentActions = sequence.actions.filter(
      a => now - a.timestamp <= pattern.maxTimeWindowMs
    );

    if (recentActions.length < pattern.pattern.length) {
      return false;
    }

    // Check if pattern appears in order (not necessarily consecutively)
    let patternIndex = 0;
    for (const action of recentActions) {
      if (this.matchesEventType(action.eventType, pattern.pattern[patternIndex])) {
        patternIndex++;
        if (patternIndex === pattern.pattern.length) {
          return true; // Full pattern matched
        }
      }
    }

    return false;
  }

  /**
   * Match event type with possible wildcard
   */
  private matchesEventType(eventType: string, pattern: string): boolean {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return eventType.startsWith(prefix);
    }
    return eventType === pattern;
  }

  /**
   * Calculate cumulative risk with time decay
   */
  private calculateCumulativeRisk(sequence: AgentSequence, newRisk: number): number {
    const now = Date.now();
    const timeSinceLastUpdate = now - sequence.lastUpdated;
    
    // Decay factor: risk halves every 5 minutes
    const decayFactor = Math.pow(0.5, timeSinceLastUpdate / 300000);
    
    const decayedRisk = sequence.cumulativeRisk * decayFactor;
    return Math.min(100, decayedRisk + newRisk);
  }

  /**
   * Remove old actions from history
   */
  private pruneHistory(sequence: AgentSequence): void {
    const now = Date.now();
    
    // Remove expired actions
    sequence.actions = sequence.actions.filter(
      a => now - a.timestamp <= this.historyTTLMs
    );
    
    // Limit history size
    if (sequence.actions.length > this.maxHistorySize) {
      sequence.actions = sequence.actions.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get current sequence for an agent
   */
  getSequence(agentId: string): AgentSequence | undefined {
    return this.sequences.get(agentId);
  }

  /**
   * Clear agent history (e.g., after session end)
   */
  clearAgent(agentId: string): void {
    this.sequences.delete(agentId);
  }

  /**
   * Add custom pattern at runtime
   */
  addPattern(pattern: SequencePattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): SequencePattern[] {
    return [...this.patterns];
  }
}

// Singleton instance
let instance: SequenceAnalyzer | null = null;

export function getSequenceAnalyzer(options?: ConstructorParameters<typeof SequenceAnalyzer>[0]): SequenceAnalyzer {
  if (!instance) {
    instance = new SequenceAnalyzer(options);
  }
  return instance;
}

export default SequenceAnalyzer;
