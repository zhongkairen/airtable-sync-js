import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { fileURLToPath } from 'url';
import { hideBin } from 'yargs/helpers';
import { CustomLogger } from './custom-logger.js';
import { AirtableConfig, GitHubConfig } from './config.js';
import { AirtableSync } from './airtable-sync.js';

let logger;

function parseArguments() {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .option('d', { alias: 'debug', type: 'boolean', describe: 'Set logging level to DEBUG' })
    .option('v', {
      alias: 'verbose',
      type: 'boolean',
      describe: 'Set logging level to VERBOSE',
    })
    .option('i', { alias: 'info', type: 'boolean', describe: 'Set logging level to INFO' })
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

function findFirstExistingFile(directories, filename) {
  for (const dir of directories) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

function getConfigFilePath() {
  const CONFIG_FILE_NAME = 'config.json';
  const currentDir = process.cwd();
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));

  const configPath = findFirstExistingFile([currentDir, scriptDir], CONFIG_FILE_NAME);
  if (!configPath) {
    throw new Error(`${CONFIG_FILE_NAME} not found in ${currentDir} and ${scriptDir}.`);
  }
  return configPath;
}

async function main() {
  const logLevel = parseArguments();
  CustomLogger.setLogLevel(logLevel);
  logger = new CustomLogger(import.meta.url);
  logger.info(`log level set to '${logLevel}'`);
  logger.debug('Reading records from Airtable...');

  let airtableSync;
  try {
    const configPath = getConfigFilePath();
    const configJson = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const airtableConfig = new AirtableConfig(configJson.airtable);
    const githubConfig = new GitHubConfig(configJson.github);

    airtableSync = new AirtableSync(airtableConfig, githubConfig);
  } catch (error) {
    logger.error(`Error reading configuration file: ${error.message}`);
  }

  logger.info('Reading records from Airtable...');
  await airtableSync.sync();
}

main().catch((err) => console.error(`Unexpected error: ${err.message}`));
