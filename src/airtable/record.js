import { URL } from 'url';
import { CustomLogger } from '../custom-logger.js';

const logger = new CustomLogger(import.meta.url);

/**
 * Class representing an Airtable record.
 */
class AirtableRecord {
  /**
   * List of compulsory fields for the record.
   * @type {array<string>}
   */
  static _requiredFields = ['Title', 'Issue Link', 'Issue Number'];

  constructor(recordDict) {
    // Record dictionary to store the record data.
    this._recordDict = recordDict;
    // Dictionary to store the updated fields.
    this._updatedFields = {};
  }

  /**
   * ID of the record.
   * @readonly
   * @returns {string} - The ID of the record.
   */
  get id() {
    // ID of the record.
    return this._recordDict.id;
  }

  /**
   * Title of the record.
   * @readonly
   * @returns {string} - The title of the record.
   */
  get title() {
    // Title of the record.
    return this._recordDict.fields?.Title || '';
  }

  /**
   * Issue number in the record, corresponds to the GitHub issue number.
   * @readonly
   * @returns {number | undefined} - The issue number; undefined if field is not present.
   */
  get issueNumber() {
    // Issue number in the record, corresponds to the GitHub issue number.
    const issueNum = this._recordDict.fields?.['Issue Number'];
    return issueNum != null ? Number(issueNum) : undefined;
  }

  /**
   * Link to the GitHub issue in the record.
   * @readonly
   * @returns {string} - The issue link; empty string if field is not present.
   */
  get issueLink() {
    // Link to the GitHub issue in the record.
    return this._recordDict.fields?.['Issue Link'] ?? '';
  }

  /**
   * Repository name extracted from the issue link.
   * @readonly
   * @returns {string | undefined} - The repository name; undefined if required pattern is not present.
   */
  get repoName() {
    // Repository name extracted from the issue link.
    if (!this.issueLink) return undefined;
    const pathParts = new URL(this.issueLink).pathname.split('/');
    const index = pathParts.lastIndexOf('issues');
    if (index < 2) return undefined;
    return pathParts[index - 1];
  }

  /**
   * Updated fields in the record.
   * @readonly
   * @returns {object} - Dictionary containing the record's ID and updated fields.
   */
  get updatedFields() {
    return { id: this.id, fields: this._updatedFields };
  }

  /// todo: refactor, as the Airtable API is different in js.
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

  /// todo: on hold, schema might not be available
  static validateSchema(schema) {
    // Validate that the provided schema contains all required fields.
    const missingFields = this._requiredFields.filter((field) => !(field in schema));
    const valid = missingFields.length === 0;
    const error = valid
      ? null
      : `Required fields ${missingFields} are not found in schema: ${Object.keys(schema)}`;
    return [valid, error];
  }

  /**
   * @returns {string} - String representation of the object.
   */
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
    )} | ${fieldsStr}`;
  }

  /**
   * Set the value of a field in the record.
   * @param {string} field - The field to set.
   * @returns {object} - updated fields.
   */
  setFields(fields) {
    // Set multiple fields for the record.
    for (const [field, value] of Object.entries(fields)) {
      this._setField(field, value);
    }
    return this.updatedFields;
  }

  /**
   * Set the value of a specified field in the record for later update.
   * @param {*} field
   * @param {*} value
   * @returns {void}
   */
  _setField(field, value) {
    // Set the value of a specified field and marks it for update.
    const currentValue = this._recordDict.fields[field];
    const formattedValue = AirtableRecord._stringify(value);

    if (currentValue === formattedValue) {
      return;
    }

    logger.debug(
      `Record ${this.issueNumber} fields '${field}': ${currentValue} -> ${formattedValue}`
    );

    if (currentValue !== undefined && typeof currentValue !== typeof formattedValue) {
      logger.warn(`Field type mismatch: ${field} - ${currentValue} != ${typeof formattedValue}`);
      return;
    }

    this._updatedFields[field] = formattedValue;
  }

  /**
   * Format the input value to string.
   * @param {*} value input value to format.
   * @returns string representation of the value. undefined and null will mapped to literal 'undefined' and 'null'.
   */
  static _stringify(value) {
    if (value instanceof Date) return value.toISOString().split('T')[0]; // "YYYY-MM-DD" format
    return String(value);
  }
}

export { AirtableRecord };
