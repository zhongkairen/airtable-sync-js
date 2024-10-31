import { GitHubConfig } from './github/config.js';
import { GitHubClient } from './github/client.js';
import { GitHubIssue } from './github/issue.js';
import { AirtableConfig } from './airtable/config.js';
import { AirtableClient } from './airtable/client.js';
import { AirtableRecord } from './airtable/record.js';
import { UpdateResult } from './airtable/update-result.js';
import { CustomLogger } from './custom-logger.js';

const logger = new CustomLogger(__filename);

export class AirtableSync {
    private static _fieldMap: { [key: string]: string };
    private airtableConfig: AirtableConfig;
    private airtable: AirtableClient;
    private github: GitHubClient;

    constructor(airtableConfig: AirtableConfig, githubConfig: GitHubConfig) {
        this.airtableConfig = airtableConfig;
        this.airtable = new AirtableClient(airtableConfig);
        this.github = new GitHubClient(githubConfig);
        AirtableSync._fieldMap = Object.entries(githubConfig.fieldMap).reduce((acc, [k, v]) => {
            acc[GitHubIssue.mapFieldName(k)] = v;
            return acc;
        }, {} as { [key: string]: string });
        // Ensure only the records in the relevant repository are synced
        this.airtable.currentRepo = githubConfig.repoName || '';
    }

    public readRecords(): void {
        // Read all records in Airtable
        this.airtable.readRecords();
    }

    public readIssues(): void {
        // Read all issues in GitHub
        this.github.fetchProjectId();
        this.github.fetchProjectItems();
    }

    public get fieldMap(): { [key: string]: string } {
        // Map the fields from GitHub to Airtable
        return AirtableSync._fieldMap;
    }

    private _verifySyncFields(): boolean {
        // Verify the fields to be synced are in the Airtable table schema
        const missingFields: string[] = [];

        for (const fieldName of Object.values(this.fieldMap)) {
            if (!this.airtable.fieldInSchema(fieldName)) {
                missingFields.push(fieldName);
            }
        }

        if (missingFields.length > 0) {
            const stringify = (x: string[]) => x.map(item => `"${item}"`).join(", ");
            logger.error(`Unknown field(s): ${stringify(missingFields)} not found in Airtable table schema: ${stringify(Object.keys(this.airtable.tableFieldsSchema))}.`);
        }

        return missingFields.length === 0;
    }

    private _verifyRecordField(): boolean {
        // Verify the record field against the Airtable table fields schema
        const [valid, error] = AirtableRecord.validateSchema(this.airtable.tableFieldsSchema);
        if (error) {
            logger.error(error);
        }
        return valid;
    }

    public async sync(): Promise<void> {
        // Reconcile the records in Airtable with the issues in GitHub
        this._prepSync();

        const updateDictList: any[] = [];

        logger.verbose(`Syncing ${this.airtable.recordsInCurrentRepo.length} record(s) from current_repo: ${this.airtable.currentRepo}, of total ${this.airtable.records.length} record(s).`);

        for (const record of this.airtable.recordsInCurrentRepo) {
            const issue = await this._getIssue(record);
            const updateDict = this._updateFields(record, issue);
            if (updateDict) {
                updateDictList.push(updateDict);
            }
        }

        // Perform the batch update and handle the result
        const updateResult = this.airtable.batchUpdate(updateDictList);

        // Log the final sync result
        this._logSyncResult(updateResult, logger);
    }

    private _prepSync(): void {
        // Prepare the synchronization process between Airtable and GitHub
        if (!(this._verifySyncFields() && this._verifyRecordField())) {
            throw new Error("Sync aborted due to missing fields in Airtable table schema.");
        }

        // Read the records from Airtable
        this.readRecords();

        // Read the issues from GitHub
        this.readIssues();
    }

    private async _getIssue(record: AirtableRecord): Promise<GitHubIssue> {
        // Retrieve the GitHub issue or create one from an Airtable record
        return await this.github.fetchIssue(record.issueNumber);
    }

    private _logSyncResult(syncResult: UpdateResult, logger: CustomLogger): void {
        // Log the final sync result based on update counts
        if (syncResult.error) {
            logger.error(syncResult.error);
        }

        if (syncResult.updates) {
            logger.verbose('\n' + syncResult.updates);
        }

        logger.info(`synced ${this.airtable.recordsInCurrentRepo.length} record(s): ${syncResult}`);
    }

    private _updateFields(record: AirtableRecord, issue: GitHubIssue): { [key: string]: any } {
        // Update the fields in the Airtable record (target) from the GitHub issue (source)
        const updatedFields: { [key: string]: any } = {};

        for (const [githubField, airtableField] of Object.entries(this.fieldMap)) {
            const value = issue.fields[githubField];
            if (value && this.airtable.fieldInSchema(airtableField)) {
                updatedFields[airtableField] = value;
            }
        }

        // Set the filtered fields to the record
        return record.setFields(updatedFields);
    }
}