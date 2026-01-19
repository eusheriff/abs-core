# Non-Goals

`abs-core` is a specialized runtime for **governed autonomous business processes**.
To maintain focus and reliability, we explicitly define what this project is NOT.

## 1. This is NOT a "General Purpose Agent Framework"
*   **We do NOT build**: Tools like AutoGPT or BabyAGI that loop indefinitely to "solve world hunger".
*   **We DO build**: A deterministic `Event -> Decision -> Action` loop for defined business steps (e.g., Lead Qualification, Refund Processing).

## 2. This is NOT a Chatbot
*   **We do NOT build**: Conversational memory, RAG for Q&A, or persona management.
*   **We DO build**: Structured JSON processing. The "User" is usually a system (Webhook/API), not a human chatting.

## 3. This is NOT Robotic Process Automation (RPA)
*   **We do NOT build**: Screen scrapers, mouse clickers, or browser automation macros.
*   **We DO build**: API-first integration via structured connectors.

## 4. This is NOT "Full Autonomy"
*   **We do NOT promise**: That the AI will never make mistakes.
*   **We DO promise**: That when the AI makes a mistake, the Policy Engine will catch critical violations, and the Audit Log will record exactly what happened.

## Summarizing
If you want a magic bot that "figures it out", look elsewhere.
If you want a reliable engine to automate business decisions with **audit trails and safety brakes**, you are in the right place.
