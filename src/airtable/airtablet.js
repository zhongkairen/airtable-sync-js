// import { AirtablePlus } from 'airtable-plus';
import AirtablePlus from 'airtable-plus';

class Airtablet extends AirtablePlus {
    /**
     * @param {{ baseId: string; apiKey: string }} config
     */
    constructor(config) {
        super(config); // Call the parent class constructor
        this.config = config;
    }

    /**
     * Method that returns a table schema using your AirtableTable interface
     * @param {string} tableName
     * @returns {AirtableTable}
     */
    getTableSchema(tableName) {
        const table = super.table(tableName); // Hypothetical method from airtable-plusplus
        return {
            id: table.id,
            name: table.name,
            fields: table.fields.map((field) => ({
                id: field.id,
                name: field.name,
                type: field.type,
            })),
        };
    }
}

export { Airtablet };