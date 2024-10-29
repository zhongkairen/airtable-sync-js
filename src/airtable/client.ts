import { Api } from 'pyairtable';
import { AirtableConfig } from './config';
import { UpdateResult } from './update_result';
import { CustomLogger } from '../custom_logger';
import { AirtableRecord } from './record';

const logger = new CustomLogger(__filename);

export class AirtableClient {
    private config: AirtableConfig;
    private api: Api;
    private table: any; // Replace with actual type if available
    private _records: AirtableRecord[] = [];
    private _currentRepo: string | null = null;
    private _tableSchema: any = null; // Replace with actual type if available

    constructor(config: AirtableConfig) {
        this.config = config;
        this.api = new Api(this.config.token);
        this.table = this.api.table(this.config.appId, this.config.tableId);
    }

    public get tableSchema(): any { // Replace with actual type if available
        if (!this._tableSchema) {
            this._tableSchema = this.table.schema();
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
        logger.verbose(`Reading Airtable records from base: ${this.config.appId} table: ${this.config.tableId} view: '${this.config.viewName}'`);
        this._records = this.table.all({ view: this.config.viewName }).map((entry: any) => new AirtableRecord(entry));

        const recordsLog = this.records.map(record => `    ${record.issueNumber} ${record.title}`).join('\n');
        logger.debug(`all records: \n${recordsLog}`);
    }

    public get currentRepo(): string | null {
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

        updatedRecordList.forEach(updatedRecord => {
            const recordId = updatedRecord.id;
            const record = this.getRecordById(recordId);
            const issueNumber = record ? record.issueNumber : null;
            const context: { [key: string]: any } = { id: recordId, issue_number: issueNumber };
            let changes: any = null;
            let error: any = null;
            let status: UpdateResult.Status;

            if (!record) {
                error = `record ${recordId} not found`;
                status = UpdateResult.Status.FAILED;
            } else {
                [changes, error] = record.commitChanges(updatedRecord);
                status = changes ? UpdateResult.Status.UPDATED : error ? UpdateResult.Status.FAILED : UpdateResult.Status.UNCHANGED;
            }

            context.changes = changes;
            context.error = error;
            syncResult.addRecordStatus(context, status);
        });

        return syncResult;
    }
}