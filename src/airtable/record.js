import { URL } from 'url';
import { CustomLogger } from '../custom-logger.js';
import { __filename__ } from '../path-util.js';
const logger = new CustomLogger(__filename__(import.meta.url));

// Convert the class to JavaScript by removing TypeScript-specific syntax
class AirtableRecord {
  // List of compulsory fields for the record.
  static _requiredFields = ['Title', 'Issue Link', 'Issue Number'];

  // Record dictionary to store the record data.
  _recordDict;

  // Dictionary to store the updated fields.
  _updatedFields;

  constructor(recordDict) {
    this._recordDict = recordDict;
    this._updatedFields = {};
  }

  get id() {
    // ID of the record.
    return this._recordDict.id;
  }

  get title() {
    // Title of the record.
    return this._recordDict.fields?.Title || '';
  }

  get issueNumber() {
    // Issue number in the record, corresponds to the GitHub issue number.
    return Number(this._recordDict.fields?.['Issue Number']);
  }

  get issueLink() {
    // Link to the GitHub issue in the record.
    return this._recordDict.fields?.['Issue Link'] || '';
  }

  get repoName() {
    // Repository name extracted from the issue link.
    const pathParts = new URL(this.issueLink).pathname.split('/');
    const index = pathParts.indexOf('issues');
    if (index !== -1) {
      return pathParts[index - 1];
    } else {
      throw new Error(`Invalid issue link format: ${this.issueLink}`);
    }
  }

  get updatedFields() {
    // Dictionary containing the record's ID and updated fields.
    return { id: this.id, fields: this._updatedFields };
  }

  commitChanges(updatedRecord) {
    // Commit changes to the record by comparing the provided updated fields with the current fields.
    let error = null;
    const changes = {};

    if (this.id !== updatedRecord.id) {
      error = `Record ID mismatch: ${updatedRecord.id} != ${this.id}`;
    } else {
      const mismatchFields = [];
      const newValues = updatedRecord.fields;
      const committedFields = [];

      for (const field of Object.keys(this._updatedFields)) {
        const expectedValue = this._updatedFields[field];
        const value = newValues[field];

        if (expectedValue === value) {
          const oldValue = this._recordDict.fields[field];
          changes[field] = { old: oldValue, new: value };
          committedFields.push(field);
          this._recordDict.fields[field] = value; // update value
        } else {
          mismatchFields.push({ field, expected: expectedValue, actual: value });
        }
      }

      // Remove marked fields
      for (const field of committedFields) {
        delete this._updatedFields[field];
      }

      if (mismatchFields.length > 0) {
        const mismatches = mismatchFields
          .map((field) => `${field.field}: ${field.expected} != ${field.actual}`)
          .join(', ');
        error = `Failed to update fields: ${mismatches}.`;
      } else if (Object.keys(this._updatedFields).length > 0) {
        error = `Failed to update fields: ${Object.keys(this._updatedFields).join(', ')}.`;
      }
    }

    return [changes, error];
  }

  static validateSchema(schema) {
    // Validate that the provided schema contains all required fields.
    const missingFields = this._requiredFields.filter((field) => !(field in schema));
    const valid = missingFields.length === 0;
    const error = valid
      ? null
      : `Required fields ${missingFields} are not found in schema: ${Object.keys(schema)}`;
    return [valid, error];
  }

  toString() {
    // String representation of the object.
    const fieldsStr = Object.entries(this._recordDict.fields)
      .map(([key, value]) => {
        if (key === 'Body' && typeof value === 'string') {
          return `${key}: ${value.slice(0, 40)}...`;
        }
        return `${key}: ${value}`;
      })
      .join(', ');

    return `${String(this.issueNumber).padStart(5)} ${this.repoName} ${this.title.slice(
      0,
      16
    )} | '${fieldsStr}'`;
  }

  setFields(fields) {
    // Set multiple fields for the record.
    for (const [field, value] of Object.entries(fields)) {
      this._setField(field, value);
    }
    return this.updatedFields;
  }

  _setField(field, value) {
    // Set the value of a specified field and marks it for update.
    const currentValue = this._recordDict.fields[field];
    const formattedValue = this._format(value);

    if (currentValue === formattedValue) {
      return;
    }

    logger.debug(
      `Record ${this.issueNumber} fields '${field}': ${currentValue} -> ${formattedValue}`
    );

    if (currentValue !== undefined && typeof currentValue !== typeof formattedValue) {
      logger.warning(`Field type mismatch: ${field} - ${currentValue} != ${typeof formattedValue}`);
      return;
    }

    this._updatedFields[field] = formattedValue;
  }

  _format(value) {
    // Format the input value based on its type.
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // "YYYY-MM-DD" format
    }
    return String(value);
  }
}

export { AirtableRecord };
