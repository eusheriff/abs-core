/**
 * Agent Memory - Tracks agent behavior history for adaptive risk scoring
 * 
 * Agents that frequently trigger escalations or blocks should have
 * elevated base risk. This creates accountability and trust building.
 * 
 * Good behavior over time reduces risk (trust decay).
 * Bad behavior increases risk with slower decay.
 */

export interface AgentStats {
  agentId: string;
  totalActions: number;
  allowedActions: number;
  blockedActions: number;
  escalatedActions: number;
  sanitizedActions: number;
  lastActionAt: number;
  lastIncidentAt: number | null;
  createdAt: number;
}

export interface AgentRiskProfile {
  agentId: string;
  baseRiskModifier: number;  // -20 to +50 modifier
  trustLevel: 'untrusted' | 'low' | 'medium' | 'high';
  incidentCount30d: number;
}

// In-memory store (can be replaced with DB adapter)
const agentStats: Map<string, AgentStats> = new Map();

/**
 * Record an action outcome for an agent
 */
export function recordAction(
  agentId: string,
  outcome: 'allowed' | 'blocked' | 'escalated' | 'sanitized'
): AgentStats {
  let stats = agentStats.get(agentId);
  
  if (!stats) {
    stats = {
      agentId,
      totalActions: 0,
      allowedActions: 0,
      blockedActions: 0,
      escalatedActions: 0,
      sanitizedActions: 0,
      lastActionAt: Date.now(),
      lastIncidentAt: null,
      createdAt: Date.now(),
    };
    agentStats.set(agentId, stats);
  }

  stats.totalActions++;
  stats.lastActionAt = Date.now();

  switch (outcome) {
    case 'allowed':
      stats.allowedActions++;
      break;
    case 'blocked':
      stats.blockedActions++;
      stats.lastIncidentAt = Date.now();
      break;
    case 'escalated':
      stats.escalatedActions++;
      stats.lastIncidentAt = Date.now();
      break;
    case 'sanitized':
      stats.sanitizedActions++;
      break;
  }

  return stats;
}

/**
 * Calculate risk profile for an agent
 */
export function getAgentRiskProfile(agentId: string): AgentRiskProfile {
  const stats = agentStats.get(agentId);
  
  if (!stats) {
    // New agent - slightly elevated risk until proven
    return {
      agentId,
      baseRiskModifier: 5,
      trustLevel: 'untrusted',
      incidentCount30d: 0,
    };
  }

  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  // Calculate incident rate
  const incidentCount = stats.blockedActions + stats.escalatedActions;
  const incidentRate = stats.totalActions > 0 
    ? incidentCount / stats.totalActions 
    : 0;

  // Time since last incident (for decay)
  const timeSinceIncident = stats.lastIncidentAt 
    ? now - stats.lastIncidentAt 
    : now - stats.createdAt;

  // Trust decay: good behavior reduces risk over time
  // Risk halves every 7 days without incident
  const trustDecay = Math.pow(0.5, timeSinceIncident / (7 * 24 * 60 * 60 * 1000));

  // Calculate base risk modifier
  // - High incident rate: +50
  // - Medium incident rate: +20
  // - Low incident rate with history: -10
  // - New agent: +5
  let baseRiskModifier: number;
  let trustLevel: AgentRiskProfile['trustLevel'];

  if (incidentRate > 0.3) {
    baseRiskModifier = 50 * trustDecay;
    trustLevel = 'untrusted';
  } else if (incidentRate > 0.1) {
    baseRiskModifier = 20 * trustDecay;
    trustLevel = 'low';
  } else if (stats.totalActions > 100 && incidentRate < 0.05) {
    baseRiskModifier = -10 * (1 - trustDecay); // Bonus for good history
    trustLevel = 'high';
  } else if (stats.totalActions > 20 && incidentRate < 0.1) {
    baseRiskModifier = 0;
    trustLevel = 'medium';
  } else {
    baseRiskModifier = 5;
    trustLevel = 'low';
  }

  return {
    agentId,
    baseRiskModifier: Math.round(baseRiskModifier),
    trustLevel,
    incidentCount30d: incidentCount, // TODO: filter by 30d
  };
}

/**
 * Calculate final risk score with agent history
 */
export function calculateAdaptiveRisk(
  agentId: string,
  baseScore: number,
  sequenceBonus: number = 0
): { finalScore: number; explanation: string } {
  const profile = getAgentRiskProfile(agentId);
  
  // Formula: finalScore = baseScore * (1 + agentModifier/100) + sequenceBonus
  const modifierFactor = 1 + (profile.baseRiskModifier / 100);
  const adjustedBase = baseScore * modifierFactor;
  const finalScore = Math.min(100, Math.max(0, adjustedBase + sequenceBonus));

  let explanation = `Base: ${baseScore}`;
  
  if (profile.baseRiskModifier !== 0) {
    const sign = profile.baseRiskModifier > 0 ? '+' : '';
    explanation += `, Agent modifier: ${sign}${profile.baseRiskModifier}% (${profile.trustLevel})`;
  }
  
  if (sequenceBonus > 0) {
    explanation += `, Sequence bonus: +${sequenceBonus}`;
  }
  
  explanation += ` = ${Math.round(finalScore)}`;

  return {
    finalScore: Math.round(finalScore),
    explanation,
  };
}

/**
 * Get stats for an agent
 */
export function getAgentStats(agentId: string): AgentStats | undefined {
  return agentStats.get(agentId);
}

/**
 * Clear agent history (for testing)
 */
export function clearAgentStats(agentId?: string): void {
  if (agentId) {
    agentStats.delete(agentId);
  } else {
    agentStats.clear();
  }
}

export default {
  recordAction,
  getAgentRiskProfile,
  calculateAdaptiveRisk,
  getAgentStats,
  clearAgentStats,
};
