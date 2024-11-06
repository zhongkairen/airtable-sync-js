import { expect } from 'chai';
import sinon from 'sinon';
import AirtablePlus from 'airtable-plus';
import { AirtableClient } from '../src/airtable/client.js';
import { AirtableRecord } from '../src/airtable/record.js';
import { AirtableSchema } from '../src/airtable/schema.js';
import { CustomLogger } from '../src/custom-logger.js';

describe('AirtableClient - readRecords', () => {
  let client;
  let airtableStub;
  let loggerStub;
  let schemaStub;

  const config = {
    baseId: 'baseId',
    token: 'apiKey',
    tableName: 'tableName',
    viewName: 'viewName',
  };

  beforeEach(() => {
    airtableStub = sinon.stub(AirtablePlus.prototype, 'read');
    loggerStub = sinon.stub(CustomLogger.prototype, 'verbose');
    schemaStub = sinon.stub(AirtableSchema.prototype, 'fetchSchema');
    client = new AirtableClient(config);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should read records from Airtable and map them to AirtableRecord instances', async () => {
    const mockRecords = [
      { id: 'rec1', fields: { issueNumber: 1, title: 'Issue 1' } },
      { id: 'rec2', fields: { issueNumber: 2, title: 'Issue 2' } },
    ];
    airtableStub.resolves(mockRecords);

    await client.readRecords();

    expect(airtableStub.calledOnce).to.be.true;
    expect(client.records).to.have.lengthOf(2);
    expect(client.records[0]).to.be.instanceOf(AirtableRecord);
    expect(client.records[0].issueNumber).to.equal(1);
    expect(client.records[0].title).to.equal('Issue 1');
    expect(client.records[1].issueNumber).to.equal(2);
    expect(client.records[1].title).to.equal('Issue 2');
  });

  it('should log the reading process', async () => {
    airtableStub.resolves([]);

    await client.readRecords();

    expect(loggerStub.calledOnce).to.be.true;
    expect(
      loggerStub.calledWith(
        `Reading Airtable records from base: ${config.appId} table: ${config.tableName} view: '${config.viewName}'`
      )
    ).to.be.true;
  });

  it('should handle empty records', async () => {
    airtableStub.resolves([]);

    await client.readRecords();

    expect(client.records).to.have.lengthOf(0);
  });
});
