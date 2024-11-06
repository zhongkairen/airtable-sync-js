import { expect } from 'chai';
import { CustomLogger } from '../src/custom-logger.js';
import { AirtableRecord } from '../src/airtable/record.js';
import { AirtableClient } from '../src/airtable/client.js';
import { loadConfig } from './config-loader.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AirtableClient - Integration Test', () => {
  let client;
  let config;

  before(() => {
    CustomLogger.setLogLevel('silent');
    config = loadConfig().airtable;
  });

  beforeEach(() => {
    client = new AirtableClient(config);
  });

  describe('init', () => {
    it('should initialize the Airtable client', async function () {
      this.timeout(5000);
      // Given the client is not initialized, i.e. tableSchema is an empty object {}
      expect(client.tableSchema).to.be.empty;
      expect(client.fieldInSchema('Title')).to.be.false;
      expect(client.fieldInSchema('Issue Number')).to.be.false;
      expect(client.fieldInSchema('Issue Link')).to.be.false;

      // When the client is initialized
      await client.init();

      // Then the table schema should be fetched and stored in the client
      expect(client.tableSchema).to.exist;
      expect(client.tableSchema).to.have.property('fields');
      expect(client.tableSchema.fields).to.be.an('array');
      expect(client.tableSchema.fields).to.have.lengthOf.at.least(3);
      expect(client.fieldInSchema('Title')).to.be.true;
      expect(client.fieldInSchema('Issue Number')).to.be.true;
      expect(client.fieldInSchema('Issue Link')).to.be.true;

      const fields = client.tableSchema.fields.map((field) => field.name);
      // console.log('tableSchema.fields:', fields.join(', '));
    });
  });

  describe('readRecords', () => {
    // const { airtable: config } = loadConfig();
    // config.viewName ??= 'Grid view';

    it('should read records from Airtable and map them to AirtableRecord instances', async function () {
      this.timeout(5000);
      const maxRecords = 10;
      await client.readRecords(maxRecords);

      expect(client.records).to.have.lengthOf(maxRecords); // limit is 10

      const verifyRecord = (record) => {
        expect(record).to.be.instanceOf(AirtableRecord);
        expect(Number.isInteger(record.issueNumber)).to.be.true;
        expect(record.title).to.be.a('string');
        expect(record.title).to.have.lengthOf.at.least(3);
        expect(record.issueLink).to.be.a('string');
        expect(record.issueLink).to.match(/^https:\/\/github.com\/.+/);
      };

      client.records.forEach(verifyRecord);
    });

    it('should read all records', async function () {
      this.timeout(10000);
      await client.readRecords();

      expect(client.records).to.have.lengthOf.at.least(11);

      const testRecords = client.records.filter((record) => record.title.startsWith('[test]'));
      expect(testRecords).to.have.lengthOf.at.least(1);
      // expect(testRecord).to.exist;
      // expect(testRecord.issueNumber).to.equal(54);
    });
  });

  describe('batchUpdate', () => {
    let uut;
    before(async function () {
      uut = new AirtableClient(config);
      this.timeout(5000);
      await uut.init();
      await uut.readRecords();
    });

    it('should update records in Airtable', async function () {
      this.timeout(10000);
      // Given the records have been populated in before(), and
      // there are records available, i.e. all records starting with '[test]' title
      const testRecords = uut.records.filter((record) => record.title.startsWith('[test]'));
      expect(testRecords).to.have.lengthOf.at.least(2);

      // console.log('testRecords[0].fields:', JSON.stringify(testRecords[0].fields, null, 2));

      // The values to update the records with,
      // IDs are not important as they will be replaced with the ones for testRecords
      const recordValues = [
        {
          id: '',
          fields: {
            'Start Date': '2023-10-22', // Date
            Alias: 'USA-101', // Text
            'Start Count': 108, // Number
          },
        },
        {
          id: '',
          fields: {
            'Start Date': '2025-07-06', // Date
            Alias: 'FIN-101', // Text
            'Start Count': 18, // Number
          },
        },
      ];

      // Backup old values
      const fieldsToUpdate = Object.keys(recordValues[0].fields);

      const oldRecords = testRecords.map((testRecord) => {
        return {
          id: testRecord.id,
          fields: fieldsToUpdate.reduce((acc, field) => {
            acc[field] = testRecord.fields[field] ?? null; // null ensures clearing works
            return acc;
          }, {}),
        };
      });

      console.log('oldRecords', JSON.stringify(oldRecords, null, 2));

      // Number of records to update is capped by the available test records (at least 2)
      const recordsToUpdate = testRecords.map((record, i) => {
        const updatedRecord = { ...recordValues[i % recordValues.length], id: record.id };
        record.setFields(updatedRecord.fields);
        return updatedRecord;
      });

      console.log('records to update: ', JSON.stringify(recordsToUpdate, null, 2));

      // When multiple records are updated
      const updateResult = await uut.batchUpdate(recordsToUpdate);

      // console.log('updateResult failed:', JSON.stringify(updateResult.failed, null, 2));

      // Then the update result should be successful
      expect(updateResult).to.exist;
      expect(updateResult).to.have.lengthOf(recordsToUpdate.length);

      console.log('updateResult:', updateResult.summary);
      expect(updateResult.failed, updateResult.error).to.have.lengthOf(0);

      // Then the records should be updated
      recordsToUpdate.forEach((record) => {
        const updatedRecord = uut.findRecordById(record.id);
        expect(updatedRecord, record.id).to.exist;

        const dFields = Object.keys(updatedRecord.fields);

        expect(dFields, record.id).to.be.an('array');
        expect(updatedRecord.fields, dFields.join(',')).to.include(record.fields);
        for (const field of fieldsToUpdate) {
          const value = updatedRecord.fields[field];
          expect(value, field).to.equal(record.fields[field]);
        }
      });

      delay(1000); // Wait to avoid rate limiting

      // Restore old values
      const updateResult2 = await uut.batchUpdate(oldRecords);
      expect(updateResult2).to.exist;
      expect(updateResult2).to.have.lengthOf(recordsToUpdate.length);
      expect(updateResult2.failed).to.lengthOf(0);
    });
  });
});
