import { expect } from 'chai';
import fs from 'fs';
import { AirtableSchema } from '../src/airtable/schema.js';
import { PathUtil } from '../src/path-util.js';
import exp from 'constants';

describe('AirtableSchema - Integration Test', () => {
  const config = JSON.parse(fs.readFileSync(PathUtil.CONFIG_FILE_PATH, 'utf8'));
  const airtableConfig = config.airtable;
  const tokenPath = PathUtil.expandHomeDir(airtableConfig.tokenPath); // Expand token path
  const token = fs.readFileSync(tokenPath, 'utf8').trim();
  airtableConfig.token = token;
  airtableConfig.viewName = 'Grid view';

  let airtableSchema;

  before(async function () {
    this.slow(4000);
    airtableSchema = new AirtableSchema(airtableConfig);
    await airtableSchema.fetchSchema();
  });

  describe('tableSchema', () => {
    it('should fetch the table schema successfully', () => {
      const schema = airtableSchema.tableSchema;
      expect(schema.name).to.equal(airtableConfig.tableName);
      expect(schema.fields).to.have.length.above(0);
      expect(schema.id.startsWith('tbl')).to.be.true;
    });
  });

  describe('baseSchema', () => {
    it('should fetch the schema successfully', () => {
      const schema = airtableSchema.baseSchema;
      expect(schema.tables).to.have.length.above(0);
    });
  });

  describe('viewSchema', () => {
    it('should fetch the view schema successfully', () => {
      const schema = airtableSchema.viewSchema;
      expect(schema.name).to.equal(airtableConfig.viewName);
      expect(schema.id.startsWith('viw')).to.be.true;
    });
  });
});