import minimist from 'minimist';
import { URLFileHandler } from './utils/URLFileHandler';
import { Logger } from './logUtils';
import { runTests } from './commands/test';
import {urlCommand} from './commands/urlCommand';
import { checkGithubToken } from './utils/helper';


const usage = `
Usage: ./run [command]

Commands:
  install           Install project dependencies
  test              Run unit tests
  <url_file>        Score modules from URLs listed in file
`;

/**
 * [main] - Home base of the program. Calls other functions based on command line
 * arguments e.g "./run test" or "./run <url_file>".
 * 
 * Note: "./run install" is handled in the bash script 
 */
async function main() {
  // Parse command line arguments
  const args = minimist(process.argv.slice(2));

  // If no arguments are provided, show usage
  if (args._.length === 0) {
    const error = new Error(`No arguments provided to ./run\n${usage}`);
    throw error;
  }

  const argument = args._[0];

  await checkGithubToken();

  if (argument === 'test') {
    Logger.logDebug('Running tests...');
    await runTests();
  }
  else {
    // Score modules from URLs listed in file (arument)
    await urlCommand(argument);
  }

}

main().catch(error => {
  Logger.logDebug(error);
  console.error(error.message);
  process.exit(1);
});