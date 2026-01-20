import { startServer } from '../src/api/server';
import { setDB, initSchema } from '../src/infra/db';
import { LocalDBAdapter } from '../src/infra/db-local';
import path from 'path';
import fs from 'fs';

// Helper to start server on random port
export async function setupTestEnv() {
    const randomPort = 4000 + Math.floor(Math.random() * 10000); // Larger range
    const dbPath = path.resolve(`./test_db_${randomPort}.sqlite`);
    
    // Clean up if exists
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    // Set env var for server to pick up
    process.env.DATABASE_URL = dbPath;

    // Start Server
    // startServer initializes DB adapter based on DATABASE_URL
    
    // For integration tests on Hono, we can often use app.request() without listening on a port.
    // However, the goal is E2E, so listening is better to test actual HTTP.
    
    try {
       // Note: startServer injects DB and inits schema async.
       // We should wait a bit or expose a promise.
       startServer(randomPort);
       
       // Give it a moment to init DB schema
       await new Promise(r => setTimeout(r, 500));
    } catch (e) {
       // Ignore if address in use, retry logic usually needed but skipping for MVP
    }
    
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
