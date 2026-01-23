"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookExecutor = void 0;
class WebhookExecutor {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }
    async execute(decision) {
        // Safe Execution Guard
        // Only execute LOW risk decisions with HIGH confidence automatically
        // For v0.5 demo, we allow it if action is NOT 'escalate_to_human'
        if (decision.recommended_action === 'escalate_to_human') {
            return {
                isSuccess: false,
                response: 'Skipped: Human escalation required',
                executed_at: new Date().toISOString()
            };
        }
        try {
            console.log(`🚀 Executing Action: ${decision.recommended_action} via Webhook`);
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: decision.recommended_action,
                    explanation: decision.explanation,
                    timestamp: new Date().toISOString()
                })
            });
            if (!response.ok) {
                throw new Error(`Webhook failed: ${response.statusText}`);
            }
            return {
                isSuccess: true,
                response: `Webhook sent to ${this.webhookUrl}`,
                executed_at: new Date().toISOString()
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
            console.error('Execution Failed:', errorMessage);
            return {
                isSuccess: false,
                error: errorMessage,
                executed_at: new Date().toISOString()
            };
        }
    }
}
exports.WebhookExecutor = WebhookExecutor;
