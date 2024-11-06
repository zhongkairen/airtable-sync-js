import { expect } from 'chai';
import sinon from 'sinon';
import { CustomLogger } from '../src/custom-logger.js';
import { AirtableSchema } from '../src/airtable/schema.js';

describe('AirtableSchema', () => {
  let uut;
  let fetchStub;
  let loggerMock;

  before(() => {
    CustomLogger.setLogLevel('silent');
  });

  beforeEach(() => {
    uut = new AirtableSchema({
      token: 'fakeToken',
      baseId: 'fakeBaseId',
      tableName: 'fakeTableName',
      viewName: 'fakeViewName',
    });
    fetchStub = sinon.stub();
    uut._fetch = fetchStub;
  });

  describe('fetchSchema', () => {
    it('should fetch the schema successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => ({ tables: [{ name: 'fakeTableName', schema: 'schema' }] }),
      };
      fetchStub.resolves(mockResponse);

      await uut.fetchSchema();

      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.calledWith('https://api.airtable.com/v0/meta/bases/fakeBaseId/tables')).to.be
        .true;
    });

    it('should handle fetch errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'error' }),
      };
      fetchStub.resolves(mockResponse);

      await uut.fetchSchema();

      expect(fetchStub.calledOnce).to.be.true;
    });

    it('should not fetch the schema if it is already fetched', async () => {
      const mockResponse = {
        ok: true,
        json: () => ({ tables: [{ name: 'fakeTableName', schema: 'schema' }] }),
      };
      fetchStub.resolves(mockResponse);

      await uut.fetchSchema();
      await uut.fetchSchema();

      expect(fetchStub.calledOnce).to.be.true;
    });
  });

  describe('tableSchema', () => {
    it('should fetch the table schema successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => ({ tables: [{ name: 'fakeTableName', schema: 'schema' }] }),
      };
      fetchStub.resolves(mockResponse);

      await uut.fetchSchema();
      const schema = uut.tableSchema;

      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.calledWith('https://api.airtable.com/v0/meta/bases/fakeBaseId/tables')).to.be
        .true;
      expect(schema).to.deep.equal({ name: 'fakeTableName', schema: 'schema' });
    });

    it('should handle fetch errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'error' }),
      };
      fetchStub.resolves(mockResponse);

      await uut.fetchSchema();
      const schema = await uut.tableSchema;

      expect(fetchStub.calledOnce).to.be.true;
      expect(schema).to.be.empty;
    });
  });

  describe('baseSchema', () => {
    it('should fetch base schema successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => ({ tables: [{ name: 'table', fields: [{ name: 'field', type: 'type' }] }] }),
      };
      fetchStub.resolves(mockResponse);

      await uut.fetchSchema();
      const schema = uut.baseSchema;

      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.calledWith('https://api.airtable.com/v0/meta/bases/fakeBaseId/tables')).to.be
        .true;
      expect(schema).to.deep.equal({
        tables: [{ name: 'table', fields: [{ name: 'field', type: 'type' }] }],
      });
    });

    it('should handle fetch errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'error' }),
      };
      fetchStub.resolves(mockResponse);

      await uut.fetchSchema();
      const schema = uut.baseSchema;

      expect(fetchStub.calledOnce).to.be.true;
      expect(schema).to.be.empty;
    });
  });

  describe('viewSchema', () => {
    it('should fetch view schema successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => ({
          tables: [
            {
              name: 'fakeTableName',
              fields: [{ name: 'field', type: 'type' }],
              views: [{ name: 'fakeViewName', schema: 'view-schema' }],
            },
          ],
        }),
      };
      fetchStub.resolves(mockResponse);

      await uut.fetchSchema();
      const schema = uut.viewSchema;

      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.calledWith('https://api.airtable.com/v0/meta/bases/fakeBaseId/tables')).to.be
        .true;
      expect(schema).to.deep.equal({ name: 'fakeViewName', schema: 'view-schema' });
    });

    it('should handle fetch errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'error' }),
      };
      fetchStub.resolves(mockResponse);

      await uut.fetchSchema();
      const schema = uut.viewSchema;

      expect(fetchStub.calledOnce).to.be.true;
      expect(schema).to.be.empty;
    });
  });
});
