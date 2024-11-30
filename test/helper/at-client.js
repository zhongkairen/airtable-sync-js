import { ClientBase } from './client-base.js';

class AirtableClient extends ClientBase {
  constructor(config) {
    super(config);
    this.#records = [];
  }

  #records;

  async readRecords() {
    const { baseId, tableName, viewName } = this.config;
    const url = `https://api.airtable.com/v0/${baseId}/${tableName}?view=${viewName}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Error: ${response.statusText}`);

    const data = await response.json();
    this.#records = data.records;

    return this.records;
  }

  get records() {
    return this.#records.filter(({ fields }) => (fields?.Labels ?? []).includes('test'));
  }
}

export { AirtableClient };
