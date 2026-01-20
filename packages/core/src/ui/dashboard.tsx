import { html } from 'hono/html';
import { Layout } from './layout';

export const Dashboard = (props: { logs: any[] }) => {
    return Layout({
        title: 'Observability',
        head: html`<meta http-equiv="refresh" content="5">`, // Simple Auto-Refresh
        children: html`
            <header>
                <div>
                    <h1>👁️ ABS Observability</h1>
                    <p style="color: var(--text-secondary); margin: 5px 0 0 0;">
                        Live Decision Audit Log
                    </p>
                </div>
                <div>
                    <span class="badge">v1.1</span>
                    <span class="badge" style="background: var(--success-color); color: white;">Running</span>
                </div>
            </header>

            <table>
                <thead>
                    <tr>
                        <th style="width: 140px;">Time</th>
                        <th>Status</th>
                        <th style="width: 200px;">Event / Trace ID</th>
                        <th>Action</th>
                        <th style="width: 150px;">Latency Analysis</th>
                        <th style="width: 80px;">Conf.</th>
                        <th>Rationale</th>
                    </tr>
                </thead>
                <tbody>
                    ${props.logs?.map(log => {
                        let decision;
                        try {
                            decision = typeof log.decision_payload === 'string' 
                                ? JSON.parse(log.decision_payload) 
                                : log.decision_payload || {};
                        } catch (e) {
                            decision = { recommended_action: 'error', confidence: 0 };
                        }
                        
                        const isSafe = (decision.confidence || 0) > 0.7;
                        // metadata might be nested under decision.metadata or just match decision property structure depending on how it was logged
                        // In processor.ts we log metadata inside the decision payload.
                        const meta = decision.metadata || {};
                        const bd = meta.latency_breakdown || {};
                        const total = (bd.llm_ms || 0) + (bd.policy_ms || 0) + (bd.db_ms || 0) + (bd.overhead_ms || 0) + (bd.sanitization_ms || 0);
                        
                        // Safety check for divide by zero
                        const pct = (val: number) => total > 0 ? (val / total) * 100 : 0;
                        
                        return html`
                            <tr>
                                <td style="color: var(--text-secondary); font-size: 12px;">
                                    ${new Date(log.created_at).toLocaleTimeString()}
                                </td>
                                <td>
                                    <span class="badge" style="background: ${log.execution_status === 'EXECUTED' ? '#238636' : (log.execution_status === 'DENY' ? '#da3633' : '#8b949e')}; color: white; font-size: 10px;">
                                        ${log.execution_status || 'PENDING'}
                                    </span>
                                </td>
                                <td>
                                    <div style="font-weight: 600; font-size: 13px;">${log.event_type}</div>
                                    <div style="font-family: monospace; font-size: 10px; color: var(--text-secondary);" title="${log.trace_id}">
                                        ${(log.trace_id || '').substring(0, 8)}...
                                    </div>
                                </td>
                                <td>
                                    <span style="font-weight: 600; font-size: 13px; color: ${isSafe ? 'var(--accent-color)' : 'var(--danger-color)'}">
                                        ${decision.recommended_action}
                                    </span>
                                </td>
                                <td>
                                    <div style="font-size: 11px; margin-bottom: 2px; display: flex; justify-content: space-between;">
                                        <span>${total > 0 ? total + 'ms' : '-'}</span>
                                        <span style="color: var(--text-secondary);">${bd.llm_ms ? 'LLM: '+bd.llm_ms+'ms' : ''}</span>
                                    </div>
                                    <div style="display: flex; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; width: 100%;">
                                        <div style="width: ${pct(bd.llm_ms || 0)}%; background: #a371f7;" title="LLM: ${bd.llm_ms}ms"></div>
                                        <div style="width: ${pct(bd.policy_ms || 0)}%; background: #f1e05a;" title="Policy: ${bd.policy_ms}ms"></div>
                                        <div style="width: ${pct(bd.db_ms || 0)}%; background: #563d7c;" title="DB: ${bd.db_ms}ms"></div>
                                        <div style="width: ${pct((bd.overhead_ms || 0) + (bd.sanitization_ms || 0))}%; background: #ccc;" title="System: ${((bd.overhead_ms||0)+(bd.sanitization_ms||0))}ms"></div>
                                    </div>
                                </td>
                                <td>
                                    <div style="font-size: 12px; font-weight: bold;">${((decision.confidence || 0) * 100).toFixed(0)}%</div>
                                </td>
                                <td>
                                    <p style="margin: 0; font-size: 12px; color: var(--text-secondary); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${decision.explanation?.summary}">
                                        ${decision.explanation?.summary || '-'}
                                    </p>
                                </td>
                            </tr>
                        `;
                    })}
                </tbody>
            </table>
            
            ${(!props.logs || props.logs.length === 0) ? html`
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    No decision logs found yet. Send an event to see it here.
                </div>
            ` : ''}
        `
    });
};
