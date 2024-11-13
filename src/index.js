import { parseArguments } from './arg-parser.js';
import { CustomLogger } from './custom-logger.js';
import { ConfigJson } from './config.js';
import { AirtableSync } from './airtable-sync.js';
import { PathUtil } from './path-util.js';

class Main {
  constructor() {
    this.logger = null;
    this.airtableSync = null;
  }

  async start() {
    const startTime = process.hrtime();
    try {
      const logLevel = parseArguments();
      CustomLogger.setLogLevel(logLevel);
      this.logger = new CustomLogger(import.meta.url);
      this.logger.info(`Log level set to '${logLevel}'`);

      await this.loadConfiguration();
      await this.syncRecords();
    } catch (error) {
      console.error(`Unexpected error: ${error.message}`);
    }

    if (CustomLogger.globalLogLevel === 'debug') {
      // Log the elapsed time
      const end = process.hrtime(startTime);
      const minutes = String(Math.floor(end[0] / 60)).padStart(2, '0');
      const seconds = String(end[0] % 60).padStart(2, '0');
      const centiseconds = String(Math.floor(end[1] / 10_000_000)).padStart(2, '0');
      this.logger.debug(`Elapsed time: ${minutes}:${seconds}.${centiseconds}`);
    }
  }

  async loadConfiguration() {
    this.logger.debug('Reading records from Airtable...');

    try {
      const configJson = new ConfigJson(PathUtil.file.configJson);
      await configJson.load();
      this.airtableSync = new AirtableSync(configJson);
    } catch (error) {
      this.logger.error(`Error reading configuration file: ${error.message}`);
      throw error; // Rethrow to handle in `start` if configuration fails
    }
  }

  async syncRecords() {
    this.logger.info('Starting sync process with Airtable...');

    try {
      await this.airtableSync.sync();
    } catch (error) {
      this.logger.debug(
        `Error syncing records: ${JSON.stringify(this.airtableSync.client.debugData)}`
      );
      this.logger.error(`Error syncing records: ${error.message}`);
    }
  }
}

// Instantiate and start the main process
const app = new Main();
app.start();
