// import { AirtablePlusPlus } from 'airtable-plusplus';

import { Airtablet } from './airtablet.js';
import { AirtableConfig } from './config.js';
import { UpdateResult, RecordContext, UpdateStatus } from './update-result.js';
import { CustomLogger } from '../custom-logger.js';
import { AirtableRecord } from './record.js';

const logger = new CustomLogger(__filename);

export class AirtableClient {
    private config: AirtableConfig;
    private airtable: Airtablet;
    private table: any; // Replace with actual type if available
    private _records: AirtableRecord[] = [];
    private _currentRepo: string = '';
    private _tableSchema: any = null; // Replace with actual type if available

    constructor(config: AirtableConfig) {
        this.config = config;
        // this.airtable = new Airtable({ apiKey: this.config.token });
        this.airtable = new Airtablet({
            baseId: this.config.appId,
            apiKey: this.config.token
        });
        // this.table = this.airtable.base(this.config.appId).table(this.config.tableId);
        // this.table = this.base(this.config.tableName);

        // this.airtable.read(this.config.tableName).then(records => {
        //     console.log(records);
        // });
    }

    public get tableSchema(): any { // Replace with actual type if available
        if (!this._tableSchema) {
            this._tableSchema = this.airtable.getTableSchema(this.config.tableName);
        }
        return this._tableSchema;
    }

    public get tableFieldsSchema(): { [key: string]: string } {
        return this._schemaFields.reduce((acc: { [key: string]: string }, fieldSchema: any) => {
            acc[fieldSchema.name] = fieldSchema.type;
            return acc;
        }, {});
    }

    private get _schemaFields(): any[] { // Replace with actual type if available
        return this.tableSchema.fields;
    }

    public fieldInSchema(fieldName: string): boolean {
        return this._schemaFields.some((fieldSchema) => fieldSchema.name === fieldName);
    }

    public readRecords(): void {
        logger.verbose(`Reading Airtable records from base: ${this.config.appId} table: ${this.config.tableName} view: '${this.config.viewName}'`);
        // this._records = this.table.all({ view: this.config.viewName }).map((entry: any) => new AirtableRecord(entry));

        this.airtable.list(this.config.tableName).then((records: AirtableRecord[]) => {
            console.log(records);
            this._records = records.map((entry: any) => new AirtableRecord(entry));
        });

        const recordsLog = this.records.map(record => `    ${record.issueNumber} ${record.title}`).join('\n');
        logger.debug(`all records: \n${recordsLog}`);
    }

    public get currentRepo(): string {
        return this._currentRepo;
    }

    public set currentRepo(newRepo: string) {
        this._currentRepo = newRepo;
    }

    public get records(): AirtableRecord[] {
        return this._records;
    }

    public get recordsInCurrentRepo(): AirtableRecord[] {
        return this.records.filter(record => record.repoName === this.currentRepo);
    }

    public getRecordById(id: string): AirtableRecord | undefined {
        return this.recordsInCurrentRepo.find(record => record.id === id);
    }

    public batchUpdate(updateDictList: any[]): UpdateResult {
        const updatedRecordList = this.table.batchUpdate(updateDictList);
        const syncResult = new UpdateResult();

        updatedRecordList.forEach((updatedRecord: any) => {
            const recordId = updatedRecord.id;
            const record = this.getRecordById(recordId);
            const issueNumber = record?.issueNumber;
            let changes: any = null;
            let error: any = null;
            let status: UpdateStatus;

            if (!record) {
                error = `record ${recordId} not found`;
                status = UpdateStatus.FAILED;
            } else {
                [changes, error] = record.commitChanges(updatedRecord);
                status = changes ? UpdateStatus.UPDATED : error ? UpdateStatus.FAILED : UpdateStatus.UNCHANGED;
            }

            const context: RecordContext = {
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