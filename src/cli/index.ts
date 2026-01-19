#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { createActor } from 'xstate';
import { EventEnvelopeSchema } from '../core/schemas';
import { leadLifecycleMachine } from '../core/machine';

const program = new Command();

program
  .name('abs')
  .description('ABS Core CLI - Simulate and Validate Autonomous Business Systems')
  .version('0.2.0');

program
  .command('validate')
  .description('Validate an event JSON against the schema')
  .argument('<file>', 'Path to JSON event file')
  .action((filePath) => {
    try {
      const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
      const json = JSON.parse(content);
      const result = EventEnvelopeSchema.safeParse(json);

      if (result.success) {
        console.log('✅ Valid Event Envelope');
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.error('❌ Validation Failed');
        console.error(result.error.format());
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`Error reading file: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('simulate')
  .description('Simulate an event transition on the Lead Machine')
  .argument('<file>', 'Path to JSON event file')
  .action((filePath) => {
    try {
      // 1. Load and Validate Event
      const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
      const json = JSON.parse(content);
      const eventParse = EventEnvelopeSchema.safeParse(json);

      if (!eventParse.success) {
        console.error('❌ Invalid Event JSON');
        console.error(eventParse.error.format());
        process.exit(1);
      }

      const envelope = eventParse.data;
      console.log(`Input Event: ${envelope.event_type} (${envelope.event_id})`);

      // 2. Map Envelope to Machine Event (Mocking the Orchestrator logic)
      // In a real system, the Orchestrator would do this mapping based on configuration
      let machineEvent: any;
      
      switch(envelope.event_type) {
        case 'lead.qualified':
          machineEvent = { type: 'lead.qualified', score: envelope.payload['score'] || 0 };
          break;
        case 'button.clicked': // Demo mapping
          if (envelope.payload['action'] === 'send_message') {
             machineEvent = { type: 'message.sent' };
          }
          break;
        default:
          console.warn(`⚠️ No mapping for event type '${envelope.event_type}'. Ignoring.`);
          return;
      }
      
      if (!machineEvent) {
          console.log("No machine transition triggered.");
          return;
      }

      // 3. Run Machine
      const actor = createActor(leadLifecycleMachine);
      actor.start();
      
      const snapshotBefore = actor.getSnapshot();
      console.log(`Current State: ${snapshotBefore.value}`);

      actor.send(machineEvent);
      
      const snapshotAfter = actor.getSnapshot();
      console.log(`New State:     ${snapshotAfter.value}`);
      
      if (snapshotBefore.value !== snapshotAfter.value) {
          console.log("✅ Transition Successful");
      } else {
          console.log("ℹ️ No State Change");
      }

    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
