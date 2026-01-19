#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import chalk from 'chalk';

const program = new Command();

program
  .name('abs-scan')
  .description('ABS Static Analysis Scanner for Governance Invariants')
  .version('0.1.0')
  .argument('[path]', 'Path to scan', '.')
  .option('-f, --format <format>', 'Output format (json, md, console)', 'console')
  .action((path, options) => {
    runScan(path, options);
  });

program.parse();

interface Finding {
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    file: string;
    line?: number;
}

function runScan(rootPath: string, options: { format: string }) {
    console.log(chalk.blue(`🔍 Scanning ${resolve(rootPath)}...`));
    
    const files = getAllFiles(rootPath);
    const findings: Finding[] = [];

    files.forEach(file => {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
            analyzeFile(file, findings);
        }
    });

    report(findings, options.format);
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
    const files = readdirSync(dir);
    files.forEach(file => {
        if (file === 'node_modules' || file === 'dist' || file === '.git') return;
        const filePath = join(dir, file);
        if (statSync(filePath).isDirectory()) {
            getAllFiles(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    });
    return fileList;
}

function analyzeFile(filePath: string, findings: Finding[]) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Rule ABS-SCAN-001: Direct LLM Execution without Policy
    // Heuristic: Has "openai/gemini" call AND "fetch/exec/db" call 
    // BUT NO "Policy" or "policy" keyword in the file.
    if (
        (content.includes('openai.') || content.includes('google.generative')) &&
        (content.includes('fetch(') || content.includes('db.run') || content.includes('exec('))
    ) {
        // Only trigger if NO policy mechanism detected
        if (!content.match(/new\s+.*Policy/i) && !content.includes('policy.evaluate')) {
             findings.push({
                id: 'ABS-SCAN-001',
                severity: 'CRITICAL',
                message: 'Potential Direct LLM-to-Action detected (No Policy Gate found).',
                file: filePath,
                line: 1 // Naive line for MVP
            });
        }
    }

    // Rule ABS-SCAN-002: Missing Decision Log
    if (
        (content.includes('openai.') || content.includes('google.generative')) &&
        !content.includes('decision_logs')
    ) {
         findings.push({
            id: 'ABS-SCAN-002',
            severity: 'HIGH',
            message: 'LLM usage detected without explicit "decision_logs" persistence.',
            file: filePath,
            line: 1
        });
    }
}

function report(findings: Finding[], format: string) {
    if (findings.length === 0) {
        console.log(chalk.green('✅ No issues found. System appears compliant.'));
        return;
    }

    if (format === 'json') {
        console.log(JSON.stringify(findings, null, 2));
    } else {
        console.log(chalk.red(`⚠️ Found ${findings.length} issues:`));
        findings.forEach(f => {
            const color = f.severity === 'CRITICAL' ? chalk.red.bold : chalk.yellow;
            console.log(color(`[${f.id}] ${f.severity}: ${f.message}`));
            console.log(chalk.gray(`  at ${f.file}:${f.line || 0}`));
        });
        
        console.log(chalk.magenta('\n💡 Recommendation: Run "abs install" to add governance middleware.'));
    }
}
