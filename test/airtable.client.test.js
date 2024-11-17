import { expect } from 'chai';
import sinon from 'sinon';
import AirtablePlus from 'airtable-plus';
import { AirtableClient } from '../src/airtable/client.js';
import { AirtableRecord } from '../src/airtable/record.js';
import { AirtableSchema } from '../src/airtable/schema.js';
import { CustomLogger } from '../src/custom-logger.js';

describe('AirtableClient', () => {
  describe('readRecords', () => {
    let uut;
    let airtableStub;
    let loggerVerboseStub;
    let loggerWarnStub;
    let schemaStub;

    const config = {
      baseId: 'baseId',
      token: 'apiKey',
      tableName: 'tableName',
      viewName: 'viewName',
    };

    beforeEach(() => {
      airtableStub = sinon.stub(AirtablePlus.prototype, 'read');
      loggerVerboseStub = sinon.stub(CustomLogger.prototype, 'verbose');
      loggerWarnStub = sinon.stub(CustomLogger.prototype, 'warn');
      schemaStub = sinon.stub(AirtableSchema.prototype, 'fetchSchema');
      uut = new AirtableClient(config);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should read records from Airtable and map them to AirtableRecord instances', async () => {
      const mockRecords = [
        { id: 'rec1', fields: { 'Issue Number': 1, Title: 'Issue 1' } },
        { id: 'rec2', fields: { 'Issue Number': 2, Title: 'Issue 2' } },
      ];
      airtableStub.resolves(mockRecords);

      await uut.readRecords();

      expect(airtableStub.calledOnce).to.be.true;
      expect(uut.records).to.have.lengthOf(2);
      expect(uut.records[0]).to.be.instanceOf(AirtableRecord);
      expect(uut.records[0].issueNumber).to.equal(1);

      expect(uut.records[0].title).to.equal('Issue 1');
      expect(uut.records[1].issueNumber).to.equal(2);
      expect(uut.records[1].title).to.equal('Issue 2');
    });

    it('should log the reading process', async () => {
      airtableStub.resolves([]);

      await uut.readRecords();

      expect(loggerVerboseStub.calledOnce).to.be.true;
      expect(
        loggerVerboseStub.calledWith(
          `Reading Airtable records from base: ${config.appId} table: ${config.tableName} view: '${config.viewName}'`
        )
      ).to.be.true;
    });

    it('should handle empty records', async () => {
      airtableStub.resolves([]);

      await uut.readRecords();

      expect(loggerVerboseStub.calledOnce).to.be.true;
      expect(loggerWarnStub.calledWith('No records found in Airtable')).to.be.true;

      expect(uut.records).to.have.lengthOf(0);
    });
  });
});
