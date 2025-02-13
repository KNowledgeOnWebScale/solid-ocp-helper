import { Command } from 'commander';
import { step1, step2 }  from '../src/main.js';

const program = new Command();

function errorToConsole(e) {
  console.error(e.message);
  if (e.cause) {
    console.error(e.cause.message);
  }
}

program
  .name('helper')
  .description('A command line interface to help getting things done on the Onto-DESIDE pods.');

program.command('step1')
  .description('The first step')
  .requiredOption('-y, --yarrrml <file>', 'YARRRML file (input)')
  .requiredOption('-s, --status <file>', 'status file (output)')
  .action(async (options) => {
    console.log("Step 1 actions...");
    try {
      await step1(options.yarrrml, options.status);
    } catch (e) {
      errorToConsole(e);
    }
  });

program.command('step2')
  .description('The second step')
  .requiredOption('-s, --status <file>', 'status file (input and output)')
  .option('-n, --no-vc', `do not write verifiable credentials resources`)
  .option('-v, --verify-vc', `verify verifiable credentials resources`)
  .action(async (options) => {
    console.log("Step 2 actions...");
    try {
      await step2(options.status, options.vc, options.verifyVc);
    } catch (e) {
      errorToConsole(e);
    }
  });

program.parse();