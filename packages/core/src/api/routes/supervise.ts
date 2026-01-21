
import { Hono } from 'hono';
import { getDB } from '../../infra/db';
import { requireScope } from '../middleware/auth';

const superviseRouter = new Hono();

// Approve a suspended task/decision
superviseRouter.post('/approve', requireScope('admin:write'), async (c) => {
    const { decision_id, note } = await c.req.json();
    const db = getDB();

    if (!decision_id) return c.json({ error: 'Missing decision_id' }, 400);

    // Update log status to ALLOW or whatever logic. 
    // In a real system, this interacts with the Orchestrator to "resume" the task.
    // For now, we just update the decision log to mark it as approved
    
    // Check if it exists and is suspended/pending
    const [existing] = await db.all<any>('SELECT * FROM decision_logs WHERE decision_id = ?', decision_id);
    if (!existing) return c.json({ error: 'Decision not found' }, 404);

    if (existing.decision !== 'ESCALATE' && existing.execution_status !== 'suspended') {
        return c.json({ error: 'Decision is not in a state that requires approval' }, 400);
    }

    await db.run(
        `UPDATE decision_logs SET decision = 'ALLOW', execution_status = 'approved', execution_response = ? WHERE decision_id = ?`,
        `Manually Approved: ${note || 'No note'}`, decision_id
    );

    // Also update pending_reviews if exists
    await db.run(
        `UPDATE pending_reviews SET status = 'approved', review_note = ?, reviewed_at = ? WHERE decision_id = ?`,
        note || '', new Date().toISOString(), decision_id
    );

    return c.json({ status: 'approved', decision_id });
});

// Reject a suspended task
superviseRouter.post('/reject', requireScope('admin:write'), async (c) => {
    const { decision_id, note } = await c.req.json();
    const db = getDB();

    if (!decision_id) return c.json({ error: 'Missing decision_id' }, 400);

    await db.run(
        `UPDATE decision_logs SET decision = 'DENY', execution_status = 'rejected', execution_response = ? WHERE decision_id = ?`,
        `Manually Rejected: ${note || 'No note'}`, decision_id
    );

     await db.run(
        `UPDATE pending_reviews SET status = 'rejected', review_note = ?, reviewed_at = ? WHERE decision_id = ?`,
        note || '', new Date().toISOString(), decision_id
    );

    return c.json({ status: 'rejected', decision_id });
});

export { superviseRouter };
