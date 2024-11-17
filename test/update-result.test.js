import { expect } from 'chai';
import { UpdateResult, UpdateStatus } from '../src/airtable/update-result.js';

describe('UpdateResult', () => {
  let uut;

  beforeEach(() => {
    uut = new UpdateResult();
  });

  describe('constructor', () => {
    it('should initialize result with empty arrays for each status', () => {
      expect(uut.result[UpdateStatus.UPDATED]).to.be.an('array').that.is.empty;
      expect(uut.result[UpdateStatus.UNCHANGED]).to.be.an('array').that.is.empty;
      expect(uut.result[UpdateStatus.FAILED]).to.be.an('array').that.is.empty;
    });
  });

  describe('toString', () => {
    it('should return the summary', () => {
      expect(uut.toString()).to.equal(uut.summary);
    });
  });

  describe('updated', () => {
    it('should return the updated records', () => {
      uut.result[UpdateStatus.UPDATED].push({ id: '1' });

      expect(uut.updated).to.deep.equal([{ id: '1' }]);
    });
  });

  describe('unchanged', () => {
    it('should return the unchanged records', () => {
      uut.result[UpdateStatus.UNCHANGED].push({ id: '1' });

      expect(uut.unchanged).to.deep.equal([{ id: '1' }]);
    });
  });

  describe('failed', () => {
    it('should return the failed records', () => {
      uut.result[UpdateStatus.FAILED].push({ id: '1' });

      expect(uut.failed).to.deep.equal([{ id: '1' }]);
    });
  });

  describe('error', () => {
    it('should return the error message if there are failed records', () => {
      uut.result[UpdateStatus.FAILED].push({ error: 'Record 1 failed' });

      expect(uut.error).to.equal('failed record(s): \n  Record 1 failed');
    });

    it('should return undefined if there are no failed records', () => {
      expect(uut.error).to.be.undefined;
    });
  });

  describe('summary', () => {
    it('should return the summary of the update result', () => {
      uut.result[UpdateStatus.UPDATED].push(
        {
          id: '1a',
          changes: { field1: { old: 'old1', new: 'new1' } },
        },
        {
          id: '1b',
          changes: { field2: { old: 'old12', new: 'new2' } },
        }
      );
      uut.result[UpdateStatus.UNCHANGED].push({ id: '2a' }, { id: '2b' }, { id: '2c' });
      uut.result[UpdateStatus.FAILED].push({ id: '3', error: 'Record 3 failed' });

      expect(uut.summary).to.equal('updated: 2, unchanged: 3, failed: 1');
    });
  });

  describe('updates', () => {
    it('should return the updates for the updated records', () => {
      uut.result[UpdateStatus.UPDATED].push({
        id: '1',
        issueNumber: 1,
        changes: { field1: { old: 'old1', new: 'new1' } },
      });

      expect(uut.updates).to.deep.equal('  Record - id:1 issueNumber:1 \n    field1: old1 -> new1');
    });
  });

  describe('addRecordStatus', () => {
    it('should add a record to the updated list', () => {
      // Given an empty result
      expect(uut.result[UpdateStatus.UPDATED]).to.be.empty;

      // When adding a record with status UPDATED
      uut.addRecordStatus({ id: '1' }, UpdateStatus.UPDATED);

      // Then the record should be added to the updated list
      expect(uut.result[UpdateStatus.UPDATED]).to.deep.equal([{ id: '1' }]);
    });
  });
});
