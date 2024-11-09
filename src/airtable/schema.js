import fetch from 'node-fetch';
import { CustomLogger } from '../custom-logger.js';

const logger = new CustomLogger(import.meta.url);

/**
 * Class to access the Airtable table schema.
 */
export class AirtableSchema {
  // Define the schema for Airtable
  constructor({ token, baseId, tableName, tableId, viewName }) {
    this.headers = {
      Authorization: `Bearer ${token}`,
    };
    this.baseId = baseId;
    this.tableName = tableName;
    this.tableId = tableId;
    this.viewName = viewName;
    this.#schema = {};
    this.#fetchMock = null; // For testing
  }

  /**
   * Meta schema for the `tables` semantics in the airtable base.
   * @type {object} */
  #schema;

  /** @type {function} fetch mock if needed */
  #fetchMock;

  /**
   * Set the fetch mock for testing.
   * @param {function} mock - The fetch mock
   */
  set fetchMock(mock) {
    this.#fetchMock = mock;
  }

  /**
   * @readonly
   * @type {object} empty object if not found
   */
  get baseSchema() {
    return this.#schema ?? {};
  }

  /**
   * Schema for the table, identified by either tableId or tableName.
   * @readonly
   * @type {object} empty object if not found
   */
  get tableSchema() {
    return (
      this.#findByField(this.baseSchema.tables, 'tableId', this.tableId) ??
      this.#findByField(this.baseSchema.tables, 'name', this.tableName) ??
      {}
    );
  }

  /**
   * Schema for the view, identified by viewName.
   * @readonly
   * @type {object} empty object if not found
   */
  get viewSchema() {
    return this.#findByField(this.tableSchema.views, 'name', this.viewName) ?? {};
  }

  /**
   * Fetch the schema of the Airtable table and store it in the instance.
   * @returns {Promise<void>} The schema of the Airtable table
   */
  async fetchSchema() {
    if (Object.keys(this.#schema ?? {}).length) return;

    const url = `https://api.airtable.com/v0/meta/bases/${this.baseId}/tables`;
    this.#schema = await this.#fetchSchema(url);
  }

  /**
   * Find an element in the array by field-value match.
   * @param {Array} array
   * @param {string} field
   * @param {*} value
   * @returns {object} the element identified by the field-value match, undefined if not found
   */
  #findByField(array, field, value) {
    if (value == null || array == null) return;
    return array.find((element) => element[field] === value);
  }

  async #fetchSchema(url) {
    const fetchFunc = this.#fetchMock ?? fetch;
    const response = await fetchFunc(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      logger.error('Failed to fetch schema:', response);
      return {};
    }

    return await response.json();
  }
}
