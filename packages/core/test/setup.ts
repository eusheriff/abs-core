import { startServer } from '../src/api/server';
import { setDB, initSchema } from '../src/infra/db';
import { LocalDBAdapter } from '../src/infra/db-local';
import path from 'path';
import fs from 'fs';

// Helper to start server on random port
export async function setupTestEnv() {
    const randomPort = 3000 + Math.floor(Math.random() * 1000);
    const dbPath = path.resolve(`./test_db_${randomPort}.sqlite`);
    
    // Clean up if exists
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    // Init DB
    const db = new LocalDBAdapter(dbPath);
    setDB(db);
    await initSchema();

    // Start Server
    // Note: startServer usually listens. We might need it to return the server instance or just run.
    // For now assuming startServer runs synchronously or returns promise. 
    // If startServer implementation blocks, we might need a refactor.
    // Checking server.ts implementation: it uses 'serve(events)' which is Hono's adapter.
    
    // For integration tests on Hono, we can often use app.request() without listening on a port.
    // However, the goal is E2E, so listening is better to test actual HTTP.
    
    try {
       startServer(randomPort);
    } catch (e) {
       // Ignore if address in use, retry logic usually needed but skipping for MVP
    }
    
    return {
        baseUrl: `http://localhost:${randomPort}`,
        cleanup: () => {
            if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
            // server.close() if possible, but Hono serve might be persistent.
            // In unit tests, we accept some leakage or use app.request.
        }
    };
}
