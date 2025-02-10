import { Command } from 'commander';
import { step1, step2 }  from '../src/main.js';

const program = new Command();

program
  .name('helper')
  .description('A command line interface to help getting things done on the Onto-DESIDE pods.');

program.command('step1')
  .description('The first step')
  .requiredOption('-y, --yarrrml <file>', 'YARRRML file (input)')
  .requiredOption('-s, --status <file>', 'status file (output)')
  .action(async (options) => {
    console.log("Step 1 actions...");
    await step1(options.yarrrml, options.status);
  });

program.command('step2')
  .description('The second step')
  .requiredOption('-s, --status <file>', 'status file (input and output)')
  .option('-v, --vc-service <url', 'URL of the vc-service', 'http://localhost:4444')
  .action(async (options) => {
    console.log("Step 2 actions...");
    await step2(options.status, options.vcService);
  });

program.parse();