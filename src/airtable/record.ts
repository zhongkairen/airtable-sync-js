import { URL } from 'url';
import { CustomLogger } from '../custom-logger.js';

const logger = new CustomLogger(__filename);

interface UpdatedFields {
    [key: string]: any;
}

class AirtableRecord {
    /**
     * Class to represent a record in Airtable.
     */

    /** List of compulsory fields for the record. */
    private static _requiredFields: string[] = ["Title", "Issue Link", "Issue Number"];

    /** Record dictionary to store the record data. */
    private _recordDict: any;

    /** Dictionary to store the updated fields. */
    private _updatedFields: UpdatedFields;

    constructor(recordDict: any) {
        this._recordDict = recordDict;
        this._updatedFields = {};
    }

    get id(): string {
        /** ID of the record. */
        return this._recordDict.id;
    }

    get title(): string {
        /** Title of the record. */
        return this._recordDict.fields?.Title || '';
    }

    get issueNumber(): number {
        /** Issue number in the record, corresponds to the GitHub issue number. */
        return Number(this._recordDict.fields?.["Issue Number"]);
    }

    get issueLink(): string {
        /** Link to the GitHub issue in the record. */
        return this._recordDict.fields?.["Issue Link"] || '';
    }

    get repoName(): string {
        /** Repository name extracted from the issue link. */
        const pathParts = new URL(this.issueLink).pathname.split('/');
        const index = pathParts.indexOf("issues");
        if (index !== -1) {
            return pathParts[index - 1];
        } else {
            throw new Error(`Invalid issue link format: ${this.issueLink}`);
        }
    }

    get updatedFields(): { id: string; fields: UpdatedFields } {
        /** Dictionary containing the record's ID and updated fields. */
        return { id: this.id, fields: this._updatedFields };
    }

    commitChanges(updatedRecord: { id: string; fields: UpdatedFields }): [UpdatedFields, string | null] {
        /**
         * Commit changes to the record by comparing the provided updated fields with the current fields.
         * @param updatedRecord - A dictionary containing the updated fields and their values.
         * @returns A tuple containing a dict of changes and an error message string.
         */
        let error: string | null = null;
        const changes: UpdatedFields = {};

        if (this.id !== updatedRecord.id) {
            error = `Record ID mismatch: ${updatedRecord.id} != ${this.id}`;
        } else {
            const mismatchFields: { field: string; expected: any; actual: any }[] = [];
            const newValues = updatedRecord.fields;
            const committedFields: string[] = [];

            for (const field of Object.keys(this._updatedFields)) {
                const expectedValue = this._updatedFields[field];
                const value = newValues[field];

                if (expectedValue === value) {
                    const oldValue = this._recordDict.fields[field];
                    changes[field] = { old: oldValue, new: value };
                    committedFields.push(field);
                    this._recordDict.fields[field] = value;  // update value
                } else {
                    mismatchFields.push({ field, expected: expectedValue, actual: value });
                }
            }

            // Remove marked fields
            for (const field of committedFields) {
                delete this._updatedFields[field];
            }

            if (mismatchFields.length > 0) {
                const mismatches = mismatchFields.map(field => `${field.field}: ${field.expected} != ${field.actual}`).join(', ');
                error = `Failed to update fields: ${mismatches}.`;
            } else if (Object.keys(this._updatedFields).length > 0) {
                error = `Failed to update fields: ${Object.keys(this._updatedFields).join(', ')}.`;
            }
        }

        return [changes, error];
    }

    static validateSchema(schema: { [key: string]: any }): [boolean, string | null] {
        /**
         * Validate that the provided schema contains all required fields.
         * @param schema - The schema to validate.
         * @returns A tuple containing a boolean indicating if the schema is valid and an optional error message.
         */
        const missingFields = this._requiredFields.filter(field => !(field in schema));
        const valid = missingFields.length === 0;
        const error = valid ? null : `Required fields ${missingFields} are not found in schema: ${Object.keys(schema)}`;
        return [valid, error];
    }

    toString(): string {
        /**
         * String representation of the object.
         * The string includes:
         * - The issue number, right-justified to 5 characters.
         * - The repository name.
         * - The first 16 characters of the title.
         * - A comma-separated list of key-value pairs from the fields dictionary.
         * - If the key is "Body" and the value is a string, only the first 40 characters of the value are included, followed by ellipses.
         */
        const fieldsStr = Object.entries(this._recordDict.fields).map(([key, value]) => {
            if (key === "Body" && typeof value === 'string') {
                return `${key}: ${value.slice(0, 40)}...`;
            }
            return `${key}: ${value}`;
        }).join(', ');

        return `${String(this.issueNumber).padStart(5)} ${this.repoName} ${this.title.slice(0, 16)} | '${fieldsStr}'`;
    }

    setFields(fields: UpdatedFields): UpdatedFields {
        /**
         * Set multiple fields for the record.
         * @param fields - A dictionary where keys are field names and values are the values to set.
         * @returns A dictionary containing the record's ID and updated fields.
         */
        for (const [field, value] of Object.entries(fields)) {
            this._setField(field, value);
        }
        return this.updatedFields;
    }

    private _setField(field: string, value: any): void {
        /**
         * Set the value of a specified field and marks it for update.
         * @param field - The name of the field to set.
         * @param value - The value to set for the field.
         */
        const currentValue = this._recordDict.fields[field];
        const formattedValue = this._format(value);

        if (currentValue === formattedValue) {
            return;
        }

        logger.debug(`Record ${this.issueNumber} fields '${field}': ${currentValue} -> ${formattedValue}`);

        if (currentValue !== undefined && typeof currentValue !== typeof formattedValue) {
            logger.warning(`Field type mismatch: ${field} - ${currentValue} != ${typeof formattedValue}`);
            return;
        }

        this._updatedFields[field] = formattedValue;
    }

    private _format(value: any): any {
        /**
         * Format the input value based on its type.
         * @param value - The input value to be formatted.
         * @returns The formatted value.
         */
        if (value instanceof Date) {
            return value.toISOString().split('T')[0]; // "YYYY-MM-DD" format
        }
        return String(value);
    }
}

export { AirtableRecord };