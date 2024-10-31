// const { AirtablePlusPlus } = require('airtable-plusplus');

const { Airtablet } = require('./airtablet.js');
const { AirtableConfig } = require('./config.js');
const { UpdateResult, RecordContext, UpdateStatus } = require('./update-result.js');
const { CustomLogger } = require('../custom-logger.js');
const { AirtableRecord } = require('./record.js');

const logger = new CustomLogger(__filename);

class AirtableClient {
    constructor(config) {
        this.config = config;
        this.airtable = new Airtablet({
            baseId: this.config.appId,
            apiKey: this.config.token
        });
        this.table = null; // Replace with actual type if available
        this._records = [];
        this._currentRepo = '';
        this._tableSchema = null; // Replace with actual type if available
    }

    get tableSchema() {
        if (!this._tableSchema) {
            this._tableSchema = this.airtable.getTableSchema(this.config.tableName);
        }
        return this._tableSchema;
    }

    get tableFieldsSchema() {
        return this._schemaFields.reduce((acc, fieldSchema) => {
            acc[fieldSchema.name] = fieldSchema.type;
            return acc;
        }, {});
    }

    get _schemaFields() {
        return this.tableSchema.fields;
    }

    fieldInSchema(fieldName) {
        return this._schemaFields.some((fieldSchema) => fieldSchema.name === fieldName);
    }

    readRecords() {
        logger.verbose(`Reading Airtable records from base: ${this.config.appId} table: ${this.config.tableName} view: '${this.config.viewName}'`);

        this.airtable.list(this.config.tableName).then((records) => {
            console.log(records);
            this._records = records.map((entry) => new AirtableRecord(entry));
        });

        const recordsLog = this.records.map(record => `    ${record.issueNumber} ${record.title}`).join('\n');
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
        return this.records.filter(record => record.repoName === this.currentRepo);
    }

    getRecordById(id) {
        return this.recordsInCurrentRepo.find(record => record.id === id);
    }

    batchUpdate(updateDictList) {
        const updatedRecordList = this.table.batchUpdate(updateDictList);
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
                status = changes ? UpdateStatus.UPDATED : error ? UpdateStatus.FAILED : UpdateStatus.UNCHANGED;
            }

            const context = {
                id: recordId,
                issueNumber: issueNumber,
                changes: changes,
                error: error
            };
            syncResult.addRecordStatus(context, status);
        });

        return syncResult;
    }
}

module.exports = { AirtableClient };
