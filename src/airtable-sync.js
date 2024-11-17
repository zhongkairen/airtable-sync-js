import { GitHubClient } from './github/client.js';
import { GitHubIssue } from './github/issue.js';
import { AirtableClient } from './airtable/client.js';
import { AirtableRecord } from './airtable/record.js';
import { UpdateResult } from './airtable/update-result.js';
import { CustomLogger } from './custom-logger.js';
import { AirtableConfig, GitHubConfig } from './config.js';

const logger = new CustomLogger(import.meta.url);

export class AirtableSync {
  /**
   * Initialize the Airtable sync service
   * @param {AirtableConfig} airtableConfig
   * @param {GitHubConfig} githubConfig
   */
  constructor({ airtableConfig, githubConfig }) {
    this.airtableConfig = airtableConfig;
    this.#airtableClient = new AirtableClient(airtableConfig);
    this.github = new GitHubClient(githubConfig);
    // todo change configuration structure, so that field mapping is not part of github config
    this.#fieldMap = Object.entries(githubConfig.fieldMap).reduce((g2aField, [k, v]) => {
      g2aField[GitHubIssue.mapFieldName(k)] = v;
      return g2aField;
    }, {});
    // Ensure only the records in the relevant repository are synced
    this.#airtableClient.currentRepo = githubConfig.repoName ?? '';
  }

  /** @type {object>} */
  #fieldMap;

  /** @type {AirtableClient>} */
  #airtableClient;

  /**
   * Reconcile the records in Airtable with the issues in GitHub
   * @returns {Promise<void>}
   */
  async sync() {
    await this.#prepSync();
    CustomLogger.timer.tapIn('Prepared sync');

    const recordsToUpdate = [];

    logger.verbose(
      `Syncing ${this.#airtableClient.recordsInCurrentRepo.length} record(s) from ` +
        `current_repo: ${this.#airtableClient.currentRepo}, of total ${this.#airtableClient.records.length} record(s).`
    );

    for (const record of this.#airtableClient.recordsInCurrentRepo) {
      const issue = this.github.epicIssues.find((issue) => issue.number === record.issueNumber);
      if (!issue) {
        logger.warn(`Issue ${record.issueNumber} not found in GitHub.`);
        continue;
      }
      const updatedFields = this.#getUpdateFields(record, issue);
      if (Object.keys(updatedFields).length === 0) {
        const recordToUpdate = record.setFields(updatedFields);
        recordsToUpdate.push(recordToUpdate);
      }
    }

    // Perform the batch update and handle the result
    CustomLogger.timer.tapIn('Before updating records');

    // todo: check why all the records are being updated
    logger.debug(`recordsToUpdate=\n ${JSON.stringify(recordsToUpdate, null, 2)}`);
    logger.debug(`Updating ${recordsToUpdate.length} record(s) in Airtable...`);
    const updateResult = await this.#airtableClient.batchUpdate(recordsToUpdate);
    logger.debug(`Updated ${recordsToUpdate.length} record(s) in Airtable...`);
    CustomLogger.timer.tapIn('Done updating records');

    // Log the final sync result
    this.#logSyncResult(updateResult, logger);
  }

  /**
   * @readonly
   * @returns {object} the field mapping between GitHub and Airtable
   */
  get fieldMap() {
    // Map the fields from GitHub to Airtable
    return this.#fieldMap;
  }

  /**
   * @readonly
   * @type {AirtableClient}
   */
  get client() {
    return this.#airtableClient;
  }

  /**
   * Prepare the synchronization process between Airtable and GitHub
   * @returns {Promise<void>}
   */
  async #prepSync() {
    await this.#airtableClient.init();

    if (!(this.#verifySyncFields() && this.#verifyRecordField()))
      throw new Error('Sync aborted due to missing fields in Airtable table schema.');

    // Read all records in Airtable
    await this.#airtableClient.readRecords();

    // Read all issues in GitHub
    await this.github.fetchProjectId();
    await this.github.fetchProjectItems();
  }

  /**
   * Verify the fields to be synced are in the Airtable table schema
   * @returns {boolean} true if the fields to be synced are in the Airtable table schema
   */
  #verifySyncFields() {
    const missingFields = Object.values(this.fieldMap).filter(
      (field) => !this.#airtableClient.fieldInSchema(field)
    );

    if (Object.keys(this.#airtableClient.tableFieldsSchema).length === 0) {
      logger.debug('tableSchema', JSON.stringify(this.#airtableClient.tableSchema, null, 2));
      logger.error('Airtable table field schema is empty.');
    } else if (missingFields.length > 0) {
      const fields = JSON.stringify(missingFields);
      const schema = JSON.stringify(Object.keys(this.#airtableClient.tableFieldsSchema));
      logger.error(`Unknown field(s): ${fields} not found in Airtable table schema: ${schema}.`);
    }

    return missingFields.length === 0;
  }

  /**
   * Verify the record field against the Airtable table fields schema
   * @returns {boolean} true if the record field is valid
   */
  #verifyRecordField() {
    const { valid, error } = AirtableRecord.validateSchema(this.#airtableClient.tableFieldsSchema);
    if (error) logger.error(error);
    return valid;
  }

  /**
   * Retrieve the GitHub issue or create one from an Airtable record
   * @param {AirtableRecord} record - the Airtable record
   * @returns {Promise<GitHubIssue>}
   */
  async #getIssue(record) {
    return await this.github.fetchIssue(record.issueNumber);
  }

  /**
   * Log the final sync result based on update counts
   * @param {UpdateResult} syncResult
   * @param {*} logger - the logger instance
   */
  #logSyncResult(syncResult, logger) {
    if (syncResult.error) logger.error(syncResult.error);

    if (syncResult.updates) logger.verbose('\n' + syncResult.updates);

    logger.info(
      `synced ${this.#airtableClient.recordsInCurrentRepo.length} record(s): ${syncResult}.`
    );
  }

  /**
   * Compare the fields in the Airtable record with the GitHub issue and return the updated fields.
   * @param {*} record destination record
   * @param {*} issue source issue
   * @returns {object} key-value pairs of fields with different values
   */
  #getUpdateFields(record, issue) {
    return Object.entries(this.fieldMap).reduce((updatedFields, [githubField, airtableField]) => {
      if (this.#airtableClient.fieldInSchema(airtableField))
        updatedFields[airtableField] = issue.fields[githubField];
      return updatedFields;
    }, {});
  }
}
