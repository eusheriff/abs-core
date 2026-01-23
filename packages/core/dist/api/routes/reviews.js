"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewsRouter = void 0;
const hono_1 = require("hono");
const db_1 = require("../../infra/db");
const auth_1 = require("../middleware/auth");
const reviews = new hono_1.Hono();
exports.reviewsRouter = reviews;
// List all pending reviews
reviews.get('/', (0, auth_1.requireScope)('admin:read'), async (c) => {
    try {
        const db = (0, db_1.getDB)();
        const status = c.req.query('status') || 'pending';
        const rows = await db.all(`SELECT * FROM pending_reviews WHERE status = ? ORDER BY created_at DESC LIMIT 100`, status);
        return c.json({ reviews: rows, count: rows.length });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return c.json({ error: 'Failed to fetch reviews', message }, 500);
    }
});
// Get specific review details
reviews.get('/:id', (0, auth_1.requireScope)('admin:read'), async (c) => {
    try {
        const db = (0, db_1.getDB)();
        const reviewId = c.req.param('id');
        const [review] = await db.all(`SELECT * FROM pending_reviews WHERE review_id = ?`, reviewId);
        if (!review) {
            return c.json({ error: 'Review not found' }, 404);
        }
        // Also fetch the original event and decision
        const [event] = await db.all(`SELECT payload FROM events_store WHERE id = ?`, review.event_id);
        const [decision] = await db.all(`SELECT full_log_json FROM decision_logs WHERE decision_id = ?`, review.decision_id);
        return c.json({
            review,
            event: event ? JSON.parse(event.payload) : null,
            decision: decision ? JSON.parse(decision.full_log_json) : null
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return c.json({ error: 'Failed to fetch review details', message }, 500);
    }
});
// Approve a pending review
reviews.post('/:id/approve', (0, auth_1.requireScope)('admin:write'), async (c) => {
    try {
        const db = (0, db_1.getDB)();
        const reviewId = c.req.param('id');
        const body = await c.req.json().catch(() => ({}));
        const reviewerId = body.reviewer_id || 'system';
        // Check review exists and is pending
        const [review] = await db.all(`SELECT * FROM pending_reviews WHERE review_id = ? AND status = 'pending'`, reviewId);
        if (!review) {
            return c.json({ error: 'Review not found or already processed' }, 404);
        }
        // Update status to approved
        await db.run(`UPDATE pending_reviews SET status = 'approved', reviewer_id = ?, reviewed_at = ? WHERE review_id = ?`, reviewerId, new Date().toISOString(), reviewId);
        // Update event status to processed
        await db.run(`UPDATE events_store SET status = 'processed' WHERE id = ?`, review.event_id);
        console.log(`✅ Review ${reviewId} approved by ${reviewerId}`);
        return c.json({
            status: 'approved',
            review_id: reviewId,
            event_id: review.event_id,
            message: 'Event approved and marked as processed'
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return c.json({ error: 'Failed to approve review', message }, 500);
    }
});
// Reject a pending review
reviews.post('/:id/reject', (0, auth_1.requireScope)('admin:write'), async (c) => {
    try {
        const db = (0, db_1.getDB)();
        const reviewId = c.req.param('id');
        const body = await c.req.json().catch(() => ({}));
        const reviewerId = body.reviewer_id || 'system';
        const reason = body.reason || 'Rejected by reviewer';
        // Check review exists and is pending
        const [review] = await db.all(`SELECT * FROM pending_reviews WHERE review_id = ? AND status = 'pending'`, reviewId);
        if (!review) {
            return c.json({ error: 'Review not found or already processed' }, 404);
        }
        // Update status to rejected
        await db.run(`UPDATE pending_reviews SET status = 'rejected', reviewer_id = ?, reviewed_at = ? WHERE review_id = ?`, reviewerId, new Date().toISOString(), reviewId);
        // Update event status to rejected
        await db.run(`UPDATE events_store SET status = 'rejected' WHERE id = ?`, review.event_id);
        // Log the rejection in decision_logs
        await db.run(`INSERT INTO decision_logs (decision_id, tenant_id, event_id, policy_name, provider, decision, execution_response, full_log_json, timestamp)
             VALUES (?, ?, ?, 'human_review', 'human', 'DENY', ?, ?, ?)`, `${review.decision_id}-rejected`, review.tenant_id, review.event_id, reason, JSON.stringify({ reviewer_id: reviewerId, reason, original_review_id: reviewId }), new Date().toISOString());
        console.log(`🚫 Review ${reviewId} rejected by ${reviewerId}: ${reason}`);
        return c.json({
            status: 'rejected',
            review_id: reviewId,
            event_id: review.event_id,
            message: 'Event rejected'
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return c.json({ error: 'Failed to reject review', message }, 500);
    }
});
