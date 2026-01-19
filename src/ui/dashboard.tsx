import { html } from 'hono/html';
import { Layout } from './layout';

export const Dashboard = (props: { logs: any[] }) => {
    return Layout({
        title: 'Observability',
        children: html`
            <header>
                <div>
                    <h1>👁️ ABS Observability</h1>
                    <p style="color: var(--text-secondary); margin: 5px 0 0 0;">
                        Live Decision Audit Log
                    </p>
                </div>
                <div>
                    <span class="badge">v0.4.0</span>
                    <span class="badge" style="background: var(--success-color); color: white;">Running</span>
                </div>
            </header>

            <table>
                <thead>
                    <tr>
                        <th style="width: 180px;">Time</th>
                        <th>Execution</th>
                        <th style="width: 250px;">Event / Trace ID</th>
                        <th>Recommended Action</th>
                        <th style="width: 100px;">Confidence</th>
                        <th>Rationale</th>
                    </tr>
                </thead>
                <tbody>
                    ${props.logs.map(log => {
                        const decision = JSON.parse(log.decision_payload);
                        const isSafe = decision.confidence > 0.7;
                        
                        let execBadgeColor = '#8b949e'; // Pending/Grey
                        if (log.execution_status === 'EXECUTED') execBadgeColor = '#238636'; // Green
                        if (log.execution_status === 'FAILED') execBadgeColor = '#da3633'; // Red
                        
                        return html`
                            <tr>
                                <td style="color: var(--text-secondary); font-size: 13px;">
                                    ${new Date(log.created_at).toLocaleString()}
                                </td>
                                <td>
                                    <span class="badge" style="background: ${execBadgeColor}; color: white; font-size: 10px;">
                                        ${log.execution_status || 'PENDING'}
                                    </span>
                                </td>
                                <td>
                                    <div style="font-weight: bold;">${log.event_type}</div>
                                    <div style="font-family: monospace; font-size: 11px; color: var(--text-secondary);">
                                        ${log.trace_id}
                                    </div>
                                </td>
                                <td>
                                    <span style="font-weight: 600; color: ${isSafe ? 'var(--accent-color)' : 'var(--danger-color)'}">
                                        ${decision.recommended_action}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="flex: 1; height: 4px; background: var(--border-color); border-radius: 2px;">
                                            <div style="width: ${decision.confidence * 100}%; height: 100%; background: ${isSafe ? 'var(--success-color)' : 'var(--danger-color)'}; border-radius: 2px;"></div>
                                        </div>
                                        <span style="font-size: 12px; width: 32px;">${(decision.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                </td>
                                <td>
                                    <p style="margin: 0 0 4px 0; font-size: 13px;">${decision.explanation?.summary}</p>
                                    <pre style="max-height: 60px;">${decision.explanation?.rationale}</pre>
                                </td>
                            </tr>
                        `;
                    })}
                </tbody>
            </table>
            
            ${props.logs.length === 0 ? html`
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    No decision logs found yet. Send an event to see it here.
                </div>
            ` : ''}
        `
    });
};
