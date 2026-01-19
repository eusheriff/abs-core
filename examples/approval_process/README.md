# Example: Automated Approval Process

This example demonstrates a classic "Human-in-the-Loop" (HITL) flow using `abs-core`.

## Scenario
A financial system requests approvals for refunds.
- **Low Risk (< $50)**: Auto-approved.
- **High Risk (> $50)**: Blocked by Policy for Manual Review.

## Files
- `events/high_value.json`: An "Enterprise" refund request (Blocked by Mock Policy).
- `events/low_value.json`: A standard refund request (Allowed).

> **Note**: In this Mock environment, we simulate the "High Risk" block by checking for the keyword "Enterprise", which triggers a restricted action (`notify_sales`) that is not in the allow-list.

## How to Run

1. **Start the Server** (if not running):
   ```bash
   npm run dev
   ```

2. **Simulate Low Value (Allowed)**:
   ```bash
   ./simulate.sh events/low_value.json
   ```
   *Expected Result*: `ALLOW`

3. **Simulate High Value (Blocked)**:
   ```bash
   ./simulate.sh events/high_value.json
   ```
   *Expected Result*: `MANUAL_REVIEW` (Blocked)
