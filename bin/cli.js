const { Command } = require('commander');
const program = new Command();

program
  .name('helper')
  .description('A command line interface to help getting things done on the Onto-DESIDE pods.');

program.command('setup')
  .description('The first step: setup')
  .requiredOption('-y, --yarrrml <file>', 'YARRRML file')
  .option('-s, --setup <file>', 'resulting setup file', 'setup.json')
  .action((options) => {
    console.log(options);
    console.log("Setup actions go here...");
  });

program.command('roundup')
  .description('The second step: roundup')
  .option('-s, --setup <file>', 'setup file resulting from a setup action', 'setup.json')
  .action((options) => {
    console.log(options);
    console.log("Roundup actions go here...");
  });

program.parse();