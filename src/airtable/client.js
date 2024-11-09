import AirtablePlus from 'airtable-plus';
import { UpdateResult, UpdateStatus } from './update-result.js';
import { CustomLogger } from '../custom-logger.js';
import { AirtableRecord } from './record.js';
import { AirtableSchema } from './schema.js';

const logger = new CustomLogger(import.meta.url);

class AirtableClient {
  constructor(config) {
    this.config = config;

    // Configuration for AirtablePlus
    const { baseId: baseID, token: apiKey, tableName, viewName } = config;
    this.airtable = new AirtablePlus({ baseID, apiKey, tableName });

    this.viewName = viewName; // Optional view name
    this.#records = [];
    this.#currentRepo = '';
    this.#schema = new AirtableSchema(config);
  }

  /** @type {Array<AirtableRecord>} */
  #records;

  /** @type {string} */
  #currentRepo;

  /** @type {AirtableSchema} */
  #schema;

  /**
   * Initialize the Airtable client
   * @returns {Promise<void>}
   */
  async init() {
    await this.#schema.fetchSchema();
  }

  /**
   * Check if a field is in the schema
   * @param {string} fieldName - The name of the field
   * @returns boolean, true if the field is in the schema
   */
  fieldInSchema(fieldName) {
    return (this.tableSchema?.fields ?? []).some((field) => field.name === fieldName);
  }

  /**
   * Read records from Airtable
   * @returns {Promise<void>}
   */
  async readRecords(maxRecords = Infinity) {
    logger.verbose(
      `Reading Airtable records from base: ${this.config.appId} table: ${this.config.tableName} view: '${this.config.viewName}'`
    );

    const options = {
      ...(maxRecords < Infinity ? { maxRecords } : {}), // Only include maxRecords if it is defined
      ...(this.viewName ? { view: this.viewName } : {}), // Only include view if viewName is defined
    };

    const records = await this.airtable.read(options);

    this.#records = records.map((entry) => new AirtableRecord(entry));

    logger.debug(
      `all records: \n${this.records
        .sort((a, b) => a.issueNumber - b.issueNumber)
        .map(
          (record) =>
            `${String(record.issueNumber).padStart(5, ' ')} - ${record.id} ${record.title}`
        )
        .join('\n')}`
    );

    if (this.records.length === 0) {
      logger.warn('No records found in Airtable');
    }
  }

  /**
   * Batch update multiple records in Airtable
   * @param {Array<{id: string, fields: object}>} recordsToUpdate - An array of objects with the fields to update
   * @returns {UpdateResult} - the result of the update operation
   */
  async batchUpdate(recordsToUpdate) {
    const syncResult = new UpdateResult();

    for (const record of recordsToUpdate) {
      const { id, fields } = record;

      this.debugData = this.debugData ?? {};
      this.debugData[id] = fields;

      const updatedRecord = await this.airtable.update(id, fields);
      this.#handleUpdatedRecord(updatedRecord, syncResult);
    }

    return syncResult;
  }

  findRecordById(id) {
    return this.recordsInCurrentRepo.find((record) => record.id === id);
  }

  /**
   * @readonly
   * @returns {object} The schema of the Airtable table
   */
  get tableSchema() {
    return this.#schema.tableSchema ?? {};
  }

  /**
   * @readonly
   * @returns {object} field name to type map of the Airtable table
   */
  get tableFieldsSchema() {
    return (this.tableSchema?.fields ?? []).reduce((fieldName2Type, field) => {
      fieldName2Type[field.name] = field.type;
      return fieldName2Type;
    }, {});
  }

  /**
   * @readonly
   * @returns {string} The name of the current repository
   * @deprecated - seems not used
   */
  get currentRepo() {
    return this.#currentRepo;
  }

  /**
   * Set the current repository name
   * @param {string} newRepo - The name of the new repository
   * @deprecated - seems not used
   */
  set currentRepo(newRepo) {
    this.#currentRepo = newRepo;
  }

  /**
   * @readonly
   * @returns {Array<AirtableRecord>} An array of all records
   * @deprecated - seems not used
   */
  get records() {
    return this.#records;
  }

  /**
   * @readonly
   * @returns {Array<AirtableRecord>} An array of all records in the current repository
   */
  get recordsInCurrentRepo() {
    if (!this.currentRepo) return this.records;
    return this.records.filter((record) => record.repoName === this.currentRepo);
  }

  #handleUpdatedRecord(updatedRecord, syncResult) {
    const recordId = updatedRecord.id;
    const record = this.findRecordById(recordId);
    const issueNumber = record?.issueNumber;
    let changes = {};
    let error;
    let status;

    if (!record) {
      error = `record ${recordId} not found`;
      status = UpdateStatus.FAILED;
    } else {
      // todo: fix this, changes seems to be wrong
      ({ changes, error } = record.commitChanges(updatedRecord));
      status =
        Object.keys(changes).length > 0
          ? UpdateStatus.UPDATED
          : error
            ? UpdateStatus.FAILED
            : UpdateStatus.UNCHANGED;
    }

    const context = {
      id: recordId,
      issueNumber,
      changes,
      error,
    };
    syncResult.addRecordStatus(context, status);
    return syncResult;
  }
}

export { AirtableClient };
