import { z } from 'zod';

export const PolicyRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  target_event_type: z.string().or(z.array(z.string())), // Single type or array of types
  priority: z.number().default(100),
  condition: z.record(z.any()), // JSON Logic object
  effect: z.enum(['ALLOW', 'DENY', 'ESCALATE', 'MONITOR']),
  reason_template: z.string().optional(),
  enabled: z.boolean().default(true)
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;
