import { GitHubClient } from './github/client.js';
import { GitHubIssue } from './github/issue.js';
import { AirtableClient } from './airtable/client.js';
import { AirtableRecord } from './airtable/record.js';
import { UpdateResult } from './airtable/update-result.js';
import { CustomLogger } from './custom-logger.js';

const logger = new CustomLogger(import.meta.url);

export class AirtableSync {
  constructor(airtableConfig, githubConfig) {
    this.airtableConfig = airtableConfig;
    this.airtable = new AirtableClient(airtableConfig);
    this.github = new GitHubClient(githubConfig);
    // todo change configuration structure, so that field mapping is not part of github config
    this.#fieldMap = Object.entries(githubConfig.fieldMap).reduce((acc, [k, v]) => {
      acc[GitHubIssue.mapFieldName(k)] = v;
      return acc;
    }, {});
    // Ensure only the records in the relevant repository are synced
    this.airtable.currentRepo = githubConfig.repoName || '';
  }

  /** @type {object>} */
  #fieldMap;

  async sync() {
    // Reconcile the records in Airtable with the issues in GitHub
    this.#prepSync();

    const recordsToUpdate = [];

    logger.verbose(
      `Syncing ${this.airtable.recordsInCurrentRepo.length} record(s) from ` +
        `current_repo: ${this.airtable.currentRepo}, of total ${this.airtable.records.length} record(s).`
    );

    for (const record of this.airtable.recordsInCurrentRepo) {
      // todo: can we get it from cache?
      // const issue = await this.#getIssue(record);
      const issue = this.github.epicIssues.find((issue) => issue.number === record.issueNumber);
      if (!issue) {
        logger.warn(`Issue ${record.issueNumber} not found in GitHub.`);
        continue;
      }
      const updatedFields = this.#getUpdateFields(record, issue);
      const recordToUpdate = record.setFields(updatedFields);
      recordToUpdate && recordsToUpdate.push(recordToUpdate);
    }

    // Perform the batch update and handle the result
    const updateResult = this.airtable.batchUpdate(recordsToUpdate);

    // Log the final sync result
    this.#logSyncResult(updateResult, logger);
  }

  get fieldMap() {
    // Map the fields from GitHub to Airtable
    return this.#fieldMap;
  }

  #prepSync() {
    // Prepare the synchronization process between Airtable and GitHub
    if (!(this.#verifySyncFields() && this.#verifyRecordField())) {
      throw new Error('Sync aborted due to missing fields in Airtable table schema.');
    }

    // Read all records in Airtable
    this.airtable.readRecords();

    // Read all issues in GitHub
    this.github.fetchProjectId();
    this.github.fetchProjectItems();
  }

  #verifySyncFields() {
    // Verify the fields to be synced are in the Airtable table schema
    const missingFields = Object.values(this.fieldMap).filter(
      (field) => !this.airtable.fieldInSchema(field)
    );

    if (missingFields.length > 0) {
      const stringify = (x) => x.map((item) => `"${item}"`).join(', ');
      const fields = stringify(missingFields);
      const schema = stringify(Object.keys(this.airtable.tableFieldsSchema));
      logger.error(`Unknown field(s): ${fields} not found in Airtable table schema: ${schema}.`);
    }

    return missingFields.length === 0;
  }

  #verifyRecordField() {
    // Verify the record field against the Airtable table fields schema
    const { valid, error } = AirtableRecord.validateSchema(this.airtable.tableFieldsSchema);
    if (error) {
      logger.error(error);
    }
    return valid;
  }

  async #getIssue(record) {
    // Retrieve the GitHub issue or create one from an Airtable record
    return await this.github.fetchIssue(record.issueNumber);
  }

  #logSyncResult(syncResult, logger) {
    // Log the final sync result based on update counts
    if (syncResult.error) logger.error(syncResult.error);

    if (syncResult.updates) logger.verbose('\n' + syncResult.updates);

    logger.info(`synced ${this.airtable.recordsInCurrentRepo.length} record(s): ${syncResult}`);
  }

  /**
   * Compare the fields in the Airtable record with the GitHub issue and return the updated fields.
   * @param {*} record destination record
   * @param {*} issue source issue
   * @returns {object} key-value pairs of fields with different values
   */
  #getUpdateFields(record, issue) {
    return Object.entries(this.fieldMap).reduce((updatedFields, [githubField, airtableField]) => {
      if (this.airtable.fieldInSchema(airtableField))
        updatedFields[airtableField] = issue.fields[githubField];
      return acc;
    }, {});
  }
}
