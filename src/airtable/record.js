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
  static REQUIRED_FIELDS = ['Title', 'Issue Link', 'Issue Number'];

  /**
   * Validate if the required fields are consistent with the provided schema.
   * i.e. the assumed fields are indeed provided by the airtable endpoint for the base.
   * @param {object} schema
   * @returns {object} - Tuple of the validation result `valid` and `error` message.
   */
  static validateSchema(schema) {
    // Validate that the provided schema contains all required fields.
    const missingFields = this.REQUIRED_FIELDS.filter((field) => !(field in schema));
    const valid = missingFields.length === 0;
    const error = valid
      ? null
      : `Required fields ${missingFields} are not found in schema: ${Object.keys(schema)}`;
    return { valid, error };
  }

  constructor(recordDict) {
    // Record dictionary to store the record data.
    const { id, fields } = recordDict ?? {};
    this.#id = id;
    this.#fields = fields ?? {};
    // Dictionary to store the updated fields.
    this.#updatedFields = {};
  }

  /** @type {string} */
  #id;

  /** @type {object} */
  #fields;

  /** @type {object} */
  #updatedFields;

  /**
   * @readonly
   * @returns {string} - The ID of the record.
   */
  get id() {
    return this.#id;
  }

  /**
   * @readonly
   * @returns {string} - The title of the record.
   */
  get title() {
    return this.fields.Title ?? '';
  }

  /**
   * @readonly
   * @returns {number | undefined} - The issue number; undefined if field is not present.
   */
  get issueNumber() {
    // Issue number in the record, corresponds to the GitHub issue number.
    const issueNum = this.fields['Issue Number'];
    return issueNum != null ? Number(issueNum) : undefined;
  }

  /**
   * @readonly
   * @returns {string} - The issue link; empty string if field is not present.
   */
  get issueLink() {
    // Link to the GitHub issue in the record.
    return this.fields['Issue Link'] ?? '';
  }

  /**
   * @readonly
   * @type {object} - Dictionary containing the record's fields.
   */
  get fields() {
    return this.#fields;
  }

  getField(fieldName) {
    return this.fields[fieldName];
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
    return { id: this.id, fields: this.#updatedFields };
  }

  /**
   * Identify the record by the provided field and value.
   * @param {string} fieldName
   * @param {*} value
   * @returns boolean - true if the record is identified by the provided field and value.
   */
  identify(fieldName, value) {
    // Identify the record by the provided field and value.
    return this.#fields[fieldName] === value;
  }

  /// todo: might need refactoring, Airtable API update method return value could be different
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

      for (const field of Object.keys(this.#updatedFields)) {
        const expectedValue = this.#updatedFields[field];
        const value = newValues[field];

        if (expectedValue === value) {
          const oldValue = this.#fields[field];
          changes[field] = { old: oldValue, new: value };
          committedFields.push(field);
          this.#fields[field] = value; // update value
        } else {
          mismatchFields.push({ field, expected: expectedValue, actual: value });
        }
      }

      // Remove marked fields
      for (const field of committedFields) {
        delete this.#updatedFields[field];
      }

      if (mismatchFields.length > 0) {
        const mismatches = mismatchFields
          .map(
            (field) =>
              `${field.field}: expected ${field.expected}(${typeof field.expected}) != ${
                field.actual
              }(${typeof field.actual}) actual`
          )
          .join(', ');
        // Some fields has unexpected values than the provided updated values
        error = `Failed to update fields[mis]: ${mismatches}.`;
      } else if (Object.keys(this.#updatedFields).length > 0) {
        // Some fields were left uncommitted
        error = `Failed to update fields[rec]: ${Object.keys(this.#updatedFields).join(', ')}.`;
      }
    }

    return { changes, error };
  }

  /**
   * @returns {string} - String representation of the object.
   */
  toString() {
    // String representation of the object.
    const fieldsStr = Object.entries(this.fields)
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
      this.#setField(field, value);
    }
    return this.updatedFields;
  }

  /**
   * Set the value of a specified field in the record for later update.
   * @param {*} field
   * @param {*} value
   * @returns {void}
   */
  #setField(field, value) {
    // Set the value of a specified field and marks it for update.
    const currentValue = this.fields[field];
    const formattedValue = this.#mapValue(value);

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

    this.#updatedFields[field] = formattedValue;
  }

  /**
   * Map the input value to type used in the update request.
   * @param {*} value input value to format.
   * @returns string representation of the value. undefined and null will mapped to literal 'undefined' and 'null'.
   */
  #mapValue(value) {
    if (typeof value === 'number') return value;
    if (value === null) return ''; // null value is treated as empty string to clear a field
    if (value instanceof Date) return value.toISOString().split('T')[0]; // "YYYY-MM-DD" format
    return String(value);
  }
}

export { AirtableRecord };
