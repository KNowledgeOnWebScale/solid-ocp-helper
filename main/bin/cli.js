import { Command, InvalidArgumentError, Option } from 'commander';
import { step1, step2 }  from '../src/main.js';

const program = new Command();

function errorToConsole(e) {
  console.error(e.message);
  if (e.cause) {
    console.error(e.cause.message);
  }
}

function parsePositiveInteger(value, dummyPrevious) {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not an integer.');
  } else if (parsedValue < 0) {
    throw new InvalidArgumentError('Not a positive integer.');
  }
  return parsedValue;
}

program
  .name('helper')
  .description('A command line interface to help getting things done on the Onto-DESIDE pods.');

program.command('step1')
  .description('The first step')
  .requiredOption('-y, --yarrrml <file>', 'YARRRML file (input)')
  .requiredOption('-s, --status <file>', 'status file (output)')
  .addOption(new Option('-d, --index-search-depth <number>', 'search for data sources this deep starting at the index file; 0 for infinite depth').default(1).argParser(parsePositiveInteger))
  .action(async (options) => {
    console.log("Step 1 actions...");
    try {
      await step1(options.yarrrml, options.status, options.indexSearchDepth);
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