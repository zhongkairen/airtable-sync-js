import { GitHubClient } from './github/client.js';
import { GitHubIssue } from './github/issue.js';
import { AirtableClient } from './airtable/client.js';
import { AirtableRecord } from './airtable/record.js';
import { UpdateResult } from './airtable/update-result.js';
import { CustomLogger } from './custom-logger.js';

const __filename = new URL(import.meta.url).pathname;
const logger = new CustomLogger(__filename);

export class AirtableSync {
    static _fieldMap = {};

    constructor(airtableConfig, githubConfig) {
        this.airtableConfig = airtableConfig;
        this.airtable = new AirtableClient(airtableConfig);
        this.github = new GitHubClient(githubConfig);
        AirtableSync._fieldMap = Object.entries(githubConfig.fieldMap).reduce((acc, [k, v]) => {
            acc[GitHubIssue.mapFieldName(k)] = v;
            return acc;
        }, {});
        // Ensure only the records in the relevant repository are synced
        this.airtable.currentRepo = githubConfig.repoName || '';
    }

    readRecords() {
        // Read all records in Airtable
        this.airtable.readRecords();
    }

    readIssues() {
        // Read all issues in GitHub
        this.github.fetchProjectId();
        this.github.fetchProjectItems();
    }

    get fieldMap() {
        // Map the fields from GitHub to Airtable
        return AirtableSync._fieldMap;
    }

    _verifySyncFields() {
        // Verify the fields to be synced are in the Airtable table schema
        const missingFields = [];

        for (const fieldName of Object.values(this.fieldMap)) {
            if (!this.airtable.fieldInSchema(fieldName)) {
                missingFields.push(fieldName);
            }
        }

        if (missingFields.length > 0) {
            const stringify = (x) => x.map(item => `"${item}"`).join(", ");
            logger.error(`Unknown field(s): ${stringify(missingFields)} not found in Airtable table schema: ${stringify(Object.keys(this.airtable.tableFieldsSchema))}.`);
        }

        return missingFields.length === 0;
    }

    _verifyRecordField() {
        // Verify the record field against the Airtable table fields schema
        const [valid, error] = AirtableRecord.validateSchema(this.airtable.tableFieldsSchema);
        if (error) {
            logger.error(error);
        }
        return valid;
    }

    async sync() {
        // Reconcile the records in Airtable with the issues in GitHub
        this._prepSync();

        const updateDictList = [];

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

    _prepSync() {
        // Prepare the synchronization process between Airtable and GitHub
        if (!(this._verifySyncFields() && this._verifyRecordField())) {
            throw new Error("Sync aborted due to missing fields in Airtable table schema.");
        }

        // Read the records from Airtable
        this.readRecords();

        // Read the issues from GitHub
        this.readIssues();
    }

    async _getIssue(record) {
        // Retrieve the GitHub issue or create one from an Airtable record
        return await this.github.fetchIssue(record.issueNumber);
    }

    _logSyncResult(syncResult, logger) {
        // Log the final sync result based on update counts
        if (syncResult.error) {
            logger.error(syncResult.error);
        }

        if (syncResult.updates) {
            logger.verbose('\n' + syncResult.updates);
        }

        logger.info(`synced ${this.airtable.recordsInCurrentRepo.length} record(s): ${syncResult}`);
    }

    _updateFields(record, issue) {
        // Update the fields in the Airtable record (target) from the GitHub issue (source)
        const updatedFields = {};

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
