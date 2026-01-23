"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = exports.app = void 0;
const node_server_1 = require("@hono/node-server");
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
const db_local_1 = require("../infra/db-local");
const db_1 = require("../infra/db");
const factory_1 = require("./factory");
const signer_1 = require("../crypto/signer");
// Load env
(0, dotenv_1.config)();
// --------------------------------------------------------
// Redis Integration
// --------------------------------------------------------
let kvOverrides = {};
if (process.env.REDIS_URL) {
    console.log('🔌 Connecting to Redis for Queue Support...');
    // Dynamic import to avoid breaking non-node bundles if this file acts as shared entry (unlikely but safe)
    // Actually server.ts is strictly Node.
    const { RedisQueueAdapter } = require('../infra/queue-redis');
    kvOverrides['EVENTS_QUEUE'] = new RedisQueueAdapter(process.env.REDIS_URL);
}
// Create Unified App
const app = (0, factory_1.createApp)(kvOverrides);
exports.app = app;
const run = (port) => {
    // Inject Local Adapter when running the server
    // Sanitize DB Path to prevent traversal
    const rawPath = process.env.DATABASE_URL || 'abs_core.db';
    const dbPath = path_1.default.resolve(rawPath);
    // Initialize Signer
    signer_1.signer.init(process.env.ABS_SECRET_KEY);
    console.log(`📦 Initializing Local DB using adapter at ${dbPath}`);
    (0, db_1.setDB)(new db_local_1.LocalDBAdapter(dbPath));
    (0, db_1.initSchema)().then(() => {
        console.log('✅ Local DB Schema Initialized');
    });
    console.log(`🚀 ABS Core Server running on port ${port} (Unified Runtime)`);
    (0, node_server_1.serve)({
        fetch: app.fetch,
        port
    });
};
const startServer = (port = 3000) => {
    run(port);
};
exports.startServer = startServer;
// Only run if called directly
if (typeof process !== 'undefined' && process.release?.name === 'node') {
    const { argv } = process;
    if (argv[1] && argv[1].endsWith('server.ts')) {
        const port = Number(process.env.PORT) || 3000;
        run(port);
    }
}
