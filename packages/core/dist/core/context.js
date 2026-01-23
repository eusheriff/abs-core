"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpanId = exports.createTraceId = void 0;
const createTraceId = () => crypto.randomUUID();
exports.createTraceId = createTraceId;
const createSpanId = () => crypto.randomUUID().substring(0, 16);
exports.createSpanId = createSpanId;
