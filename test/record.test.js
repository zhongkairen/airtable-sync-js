import { expect } from 'chai';
import { AirtableRecord } from '../src/airtable/record.js';

describe('AirtableRecord', () => {
  describe('constructor', () => {
    it('should create an instance correctly', () => {
      const recordDict = {};
      const record = new AirtableRecord(recordDict);
      expect(record._updatedFields).to.be.empty;
    });
  });

  describe('id', () => {
    it('should return the ID', () => {
      const recordDict = {
        id: 'rec123',
      };
      const record = new AirtableRecord(recordDict);
      expect(record.id).to.equal('rec123');
    });
  });

  describe('title', () => {
    it('should return the title when it is present', () => {
      const recordDict = {
        id: 'rec123',
        fields: {
          Title: 'Test Title',
        },
      };
      const record = new AirtableRecord(recordDict);
      expect(record.title).to.equal('Test Title');
    });

    it('should return an empty string when the title is not present', () => {
      const recordDict = {
        id: 'rec123',
        fields: {},
      };
      const record = new AirtableRecord(recordDict);
      expect(record.title).to.equal('');
    });

    it('should return an empty string when fields are undefined', () => {
      const recordDict = {
        id: 'rec123',
      };
      const record = new AirtableRecord(recordDict);
      expect(record.title).to.equal('');
    });
  });

  describe('issueNumber', () => {
    it('should return the issue number when it is present', () => {
      const recordDict = {
        id: 'rec123',
        fields: {
          'Issue Number': '123',
        },
      };
      const record = new AirtableRecord(recordDict);
      expect(record.issueNumber).to.equal(123);
    });

    it('should return undefined when the issue number is not present', () => {
      const recordDict = {
        id: 'rec123',
        fields: {},
      };
      const record = new AirtableRecord(recordDict);
      expect(record.issueNumber).to.be.undefined;
    });

    it('should return undefined when fields are undefined', () => {
      const recordDict = {
        id: 'rec123',
      };
      const record = new AirtableRecord(recordDict);
      expect(record.issueNumber).to.be.undefined;
    });
  });

  describe('issueLink', () => {
    it('should return the issue link when it is present', () => {
      const recordDict = {
        id: 'rec123',
        fields: {
          'Issue Link': 'http://example.com/issues/123',
        },
      };
      const record = new AirtableRecord(recordDict);
      expect(record.issueLink).to.equal('http://example.com/issues/123');
    });

    it('should return an empty string when the issue link is not present', () => {
      const recordDict = {
        id: 'rec123',
        fields: {},
      };
      const record = new AirtableRecord(recordDict);
      expect(record.issueLink).to.equal('');
    });

    it('should return an empty string when fields are undefined', () => {
      const recordDict = {
        id: 'rec123',
      };
      const record = new AirtableRecord(recordDict);
      expect(record.issueLink).to.equal('');
    });
  });

  describe('repoName', () => {
    it('should return the repository name when it is present', () => {
      const recordDict = {
        id: 'rec123',
        fields: {
          'Issue Link': 'http://example.com/user/repo/issues/123',
        },
      };
      const record = new AirtableRecord(recordDict);
      expect(record.repoName).to.equal('repo');
    });

    it('should return undefined when the repository name is not present', () => {
      const recordDict = {
        id: 'rec123',
        fields: {
          'Issue Link': 'http://example.com/issues/123',
        },
      };
      const record = new AirtableRecord(recordDict);
      expect(record.repoName).to.be.undefined;
    });

    it('should return undefined when fields are undefined', () => {
      const recordDict = {
        id: 'rec123',
      };
      const record = new AirtableRecord(recordDict);
      expect(record.repoName).to.be.undefined;
    });
  });

  describe('updatedFields', () => {
    it('should return the updated fields', () => {
      const recordDict = {
        id: 'rec123',
      };
      const record = new AirtableRecord(recordDict);
      record._updatedFields = { Title: 'Updated Title' };
      expect(record.updatedFields).to.deep.equal({
        id: 'rec123',
        fields: { Title: 'Updated Title' },
      });
    });
  });

  describe('toString', () => {
    it('should return a string representation', () => {
      const recordDict = {
        id: 'rec123',
        fields: {
          Title: 'Test Title',
          'Issue Number': '123',
          'Issue Link': 'http://example.com/repo/issues/123',
        },
      };
      const record = new AirtableRecord(recordDict);
      const expected =
        '  123 repo Test Title | Title: Test Title, Issue Number: 123, Issue Link: http://example.com/repo/issues/123';
      expect(record.toString()).to.equal(expected);
    });
  });

  describe('setFields', () => {
    it('should set the fields correctly', () => {
      const recordDict = {
        id: 'rec123',
        fields: {
          Title: 'Test Title',
          'Issue Number': '123',
          'Issue Link': 'http://example.com/repo/issues/123',
        },
      };
      const record = new AirtableRecord(recordDict);
      record.setFields({ Title: 'Updated Title', 'Issue Number': '124' });
      expect(record._updatedFields).to.deep.equal({
        Title: 'Updated Title',
        'Issue Number': '124',
      });
    });
  });

  describe('_setField', () => {
    it('should set the field correctly', () => {
      const recordDict = {
        id: 'rec123',
        fields: {
          Title: 'Test Title',
        },
      };
      const record = new AirtableRecord(recordDict);
      record._setField('Title', 'Updated Title');
      expect(record._updatedFields).to.deep.equal({
        Title: 'Updated Title',
      });
    });
  });

  describe('_stringify', () => {
    it('should format the field correctly', () => {
      const testCases = [
        {
          name: 'date',
          value: new Date('2021-01-01'),
          expected: '2021-01-01',
        },
        {
          name: 'number',
          value: 123,
          expected: '123',
        },
        {
          name: 'string',
          value: 'my text',
          expected: 'my text',
        },
        {
          name: 'undefined',
          value: undefined,
          expected: 'undefined',
        },
        {
          name: 'null',
          value: null,
          expected: 'null',
        },
      ];
      for (const testCase of testCases) {
        expect(AirtableRecord._stringify(testCase.value)).to.equal(
          testCase.expected,
          `'${testCase.name}': Expected ${testCase.value} to format as ${testCase.expected}`
        );
      }
    });
  });
});
