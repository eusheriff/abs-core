"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalDBAdapter = void 0;
const path_1 = __importDefault(require("path"));
class LocalDBAdapter {
    constructor(dbPath = 'abs_core.db') {
        this.db = null;
        this.dbPath = dbPath;
    }
    async init() {
        if (this.db)
            return;
        const fullPath = path_1.default.resolve(process.cwd(), this.dbPath);
        console.log(`📦 Initializing Local DB at ${fullPath}`);
        // Lazy load to avoid crash if not needed (e.g. CLI client mode)
        const { default: DatabaseConstructor } = await Promise.resolve().then(() => __importStar(require('better-sqlite3')));
        this.db = new DatabaseConstructor(fullPath); // Sync instantiation
        // Schema Initialization (Same as SQLiteAdapter for consistency in tests)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS decision_logs (
                decision_id TEXT PRIMARY KEY,
                tenant_id TEXT,
                event_id TEXT,
                policy_name TEXT,
                provider TEXT,
                decision TEXT,
                risk_score INTEGER DEFAULT 0,
                execution_status TEXT DEFAULT 'pending',
                execution_response TEXT,
                full_log_json TEXT,
                timestamp TEXT,
                signature TEXT,
                latency_ms INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS pending_reviews (
                review_id TEXT PRIMARY KEY,
                event_id TEXT,
                tenant_id TEXT,
                decision_id TEXT,
                status TEXT DEFAULT 'pending',
                escalation_reason TEXT,
                review_note TEXT,
                reviewer_id TEXT,
                reviewed_at TEXT,
                created_at TEXT
            );
        `);
        return Promise.resolve();
    }
    async exec(query) {
        if (!this.db)
            await this.init();
        this.db.exec(query);
    }
    async run(query, ...params) {
        if (!this.db)
            await this.init();
        try {
            this.db.prepare(query).run(...params);
            return { isSuccess: true };
        }
        catch (e) {
            console.error('DB Run Error:', e);
            throw e;
        }
    }
    async all(query, ...params) {
        if (!this.db)
            await this.init();
        return this.db.prepare(query).all(...params);
    }
}
exports.LocalDBAdapter = LocalDBAdapter;
