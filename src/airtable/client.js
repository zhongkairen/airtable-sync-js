import { Airtablet } from './airtablet.js';
import { UpdateResult, UpdateStatus } from './update-result.js';
import { CustomLogger } from '../custom-logger.js';
import { AirtableRecord } from './record.js';
import { __filename__ } from '../path-util.js';
import { AirtableSchema } from './schema.js';

const logger = new CustomLogger(__filename__(import.meta.url));

class AirtableClient {
  constructor(config) {
    this.config = config;
    this.airtable = new Airtablet({
      baseId: this.config.appId,
      apiKey: this.config.token,
    });
    this.table = null; // Replace with actual type if available
    this._records = [];
    this._currentRepo = '';
    this._schema = new AirtableSchema(config);
  }

  async init() {
    await this._schema.fetchSchema();
    this.table = this.airtable.getTable(this.config.tableName);
  }

  get tableSchema() {
    return this._schema.tableSchema;
  }

  get tableFieldsSchema() {
    return this.tableSchema.fields.reduce((acc, fieldSchema) => {
      acc[fieldSchema.name] = fieldSchema.type;
      return acc;
    }, {});
  }

  fieldInSchema(fieldName) {
    return this.tableSchema.fields.some((fieldSchema) => fieldSchema.name === fieldName);
  }

  async readRecords() {
    logger.verbose(
      `Reading Airtable records from base: ${this.config.appId} table: ${this.config.tableName} view: '${this.config.viewName}'`
    );

    const records = await this.airtable.list(this.config.tableName);

    console.log(records);
    this._records = records.map((entry) => new AirtableRecord(entry));

    const recordsLog = this.records
      .map((record) => `    ${record.issueNumber} ${record.title}`)
      .join('\n');
    logger.debug(`all records: \n${recordsLog}`);
  }

  get currentRepo() {
    return this._currentRepo;
  }

  set currentRepo(newRepo) {
    this._currentRepo = newRepo;
  }

  get records() {
    return this._records;
  }

  get recordsInCurrentRepo() {
    return this.records.filter((record) => record.repoName === this.currentRepo);
  }

  getRecordById(id) {
    return this.recordsInCurrentRepo.find((record) => record.id === id);
  }

  async batchUpdate(updateDictList) {
    const updatedRecordList = await this.table.batchUpdate(updateDictList);
    const syncResult = new UpdateResult();

    updatedRecordList.forEach((updatedRecord) => {
      const recordId = updatedRecord.id;
      const record = this.getRecordById(recordId);
      const issueNumber = record?.issueNumber;
      let changes = null;
      let error = null;
      let status;

      if (!record) {
        error = `record ${recordId} not found`;
        status = UpdateStatus.FAILED;
      } else {
        [changes, error] = record.commitChanges(updatedRecord);
        status = changes
          ? UpdateStatus.UPDATED
          : error
          ? UpdateStatus.FAILED
          : UpdateStatus.UNCHANGED;
      }

      const context = {
        id: recordId,
        issueNumber: issueNumber,
        changes: changes,
        error: error,
      };
      syncResult.addRecordStatus(context, status);
    });

    return syncResult;
  }
}

export { AirtableClient };
