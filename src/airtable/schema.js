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
    this._schema = {};
    this._fetch = fetch;
  }

  _findByField(array, field, value) {
    if (value == null) return null;
    return (array ?? []).find((element) => element[field] === value);
  }

  get baseSchema() {
    return this._schema ?? {};
  }

  get tableSchema() {
    const tableSchema = this._findByField(this.baseSchema.tables, 'tableId', this.tableId);
    if (tableSchema != null) return tableSchema;

    return this._findByField(this.baseSchema.tables, 'name', this.tableName) ?? {};
  }

  get viewSchema() {
    return this._findByField(this.tableSchema.views, 'name', this.viewName) ?? {};
  }

  async fetchSchema() {
    if (Object.keys(this._schema ?? {}).length) return;

    const url = `https://api.airtable.com/v0/meta/bases/${this.baseId}/tables`;
    this._schema = await this._fetchSchema(url);
  }

  async _fetchSchema(url) {
    const response = await this._fetch(url, {
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
