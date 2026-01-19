#!/usr/bin/env node
import { Command } from 'commander';
import { spawn } from 'child_process';
import { resolve } from 'path';

const program = new Command();

program
  .name('abs')
  .description('Autonomous Business Systems - Unified CLI')
  .version('0.5.0');

// Subcommand: SCAN
program
  .command('scan [path]')
  .description('Scan repository for governance risks')
  .action((path = '.') => {
      // Delegate to @abs/scan
      // We use spawn to run the binary from the sibling package for now 
      // or directly require if we built it. 
      // For dev simplicity (tsx), let's spawn tsx pointing to the scan package.
      
      const scanScript = resolve(__dirname, '../../scan/src/index.ts');
      
      console.log(`🚀 Delegating to ABS Scan...`);
      const child = spawn('npx', ['tsx', scanScript, path], { stdio: 'inherit', shell: true });
      
      child.on('exit', (code) => {
          process.exit(code || 0);
      });
  });

// Subcommand: SERVE (Core)
program
  .command('serve')
  .description('Start the ABS Core Runtime')
  .action(() => {
      const coreScript = resolve(__dirname, '../../core/src/api/server.ts');
      console.log(`🚀 Starting ABS Core Runtime...`);
      const child = spawn('npx', ['tsx', coreScript], { stdio: 'inherit', shell: true });
       child.on('exit', (code) => {
          process.exit(code || 0);
      });
  });

program
    .command('simulate <event_type>')
    .description('Simulate an event through the runtime')
    .option('-f, --file <file>', 'Payload file')
    .action((eventType, options) => {
        const cliScript = resolve(__dirname, '../../core/src/cli/index.ts');
        const args = ['tsx', cliScript, 'simulate', eventType];
        if (options.file) {
            args.push('-f', options.file);
        }
        
        const child = spawn('npx', args, { stdio: 'inherit', shell: true });
        child.on('exit', (code) => process.exit(code || 0));
    });

program.parse(process.argv);
