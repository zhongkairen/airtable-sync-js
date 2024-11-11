import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CustomLogger } from './custom-logger.js';
import { AirtableConfig, GitHubConfig } from './config.js';
import { AirtableSync } from './airtable-sync.js';
import { PathUtil } from './path-util.js';

let logger;

function parseArguments() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .option('d', {
      alias: 'debug',
      type: 'boolean',
      describe: 'Set logging level to DEBUG',
    })
    .option('v', {
      alias: 'verbose',
      type: 'boolean',
      describe: 'Set logging level to VERBOSE',
    })
    .option('i', {
      alias: 'info',
      type: 'boolean',
      describe: 'Set logging level to INFO',
    })
    .option('w', {
      alias: 'warning',
      type: 'boolean',
      describe: 'Set logging level to WARNING',
    })
    .conflicts('d', ['v', 'i', 'w'])
    .conflicts('v', ['d', 'i', 'w'])
    .conflicts('i', ['d', 'v', 'w'])
    .conflicts('w', ['d', 'v', 'i'])
    .help()
    .parseSync();

  const logLevel = ['debug', 'verbose', 'info', 'warning'].find((flag) => argv[flag]) || 'error';

  return logLevel;
}

async function main() {
  const logLevel = parseArguments();
  CustomLogger.setLogLevel(logLevel);
  logger = new CustomLogger(import.meta.url);
  logger.info(`log level set to '${logLevel}'`);
  logger.debug('Reading records from Airtable...');

  let airtableSync;
  try {
    const configJson = JSON.parse(fs.readFileSync(PathUtil.file.configJson, 'utf-8'));
    const airtableConfig = new AirtableConfig(configJson.airtable);
    const githubConfig = new GitHubConfig(configJson.github);

    airtableSync = new AirtableSync(airtableConfig, githubConfig);
  } catch (error) {
    logger.error(`Error reading configuration file: ${error.message}`);
  }

  logger.info('Reading records from Airtable...');

  try {
    await airtableSync.sync();
  } catch (error) {
    logger.debug(`Error syncing records: ${JSON.stringify(airtableSync.client.debugData)}`);
    logger.error(`Error syncing records: ${error.message}`);
  }
}

main().catch((err) => console.error(`Unexpected error: ${err.message}`));
