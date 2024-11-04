import { expect } from 'chai';
import { GitHubIssue } from '../src/github/issue.js';
import { formatISO } from 'date-fns';

describe('GitHubIssue', () => {
  describe('FieldType', () => {
    it('should have correct values for FieldType', () => {
      expect(GitHubIssue.FieldType.Text).to.equal('TEXT');
      expect(GitHubIssue.FieldType.Number).to.equal('NUMBER');
      expect(GitHubIssue.FieldType.Date).to.equal('DATE');
      expect(GitHubIssue.FieldType.SingleSelect).to.equal('SINGLE_SELECT');
      expect(GitHubIssue.FieldType.Iteration).to.equal('ITERATION');
    });
  });

  describe('constructor', () => {
    it('should create an instance correctly', () => {
      const url = 'http://example.com';
      const issue = new GitHubIssue(url);
      expect(issue.url).to.equal(url);
      expect(issue.title).to.be.undefined;
      expect(issue.body).to.be.undefined;
      expect(issue.number).to.be.undefined;
      expect(issue.fields).to.deep.equal({});
    });
  });

  describe('loadFields', () => {
    it('should load fields correctly', () => {
      const url = '';
      const baseData = { url, title: 'title', body: 'body' };
      const fields = {
        fieldValues: {
          nodes: [{ field: { name: 'field1' }, text: 'value1' }],
        },
      };
      const issue = new GitHubIssue(url);

      issue.loadFields(baseData, fields);
      expect(issue.url).to.equal(url);
      expect(issue.title).to.equal('title');
      expect(issue.body).to.equal('body');

      expect(issue.fields.field1).to.equal('value1');
    });
  });

  describe('toString', () => {
    it('should return a string representation', () => {
      const url = 'http://example.com';
      const title = 'title';
      const body = 'body';
      const fields = { field1: 'value1', field2: 'value2' };
      const issue = new GitHubIssue(url);
      issue.title = title;
      issue.body = body;
      issue.fields = fields;
      const expected =
        '  url: http://example.com\n  title: title\n  body: body\n  field1: value1\n  field2: value2';
      expect(issue.toString()).to.equal(expected);
    });
  });

  describe('isEpic', () => {
    it('should return true if issue type is Epic', () => {
      const url = '';
      const issue = new GitHubIssue(url);
      issue.fields.issue_type = 'Epic';
      expect(issue.isEpic).to.be.true;
    });

    it('should return false if issue type is not Epic', () => {
      const url = '';
      const issue = new GitHubIssue(url);
      issue.fields.issue_type = 'Story';
      expect(issue.isEpic).to.be.false;
    });
  });

  describe('handleFieldValues', () => {
    it('should handle field values correctly', () => {
      const url = '';
      const issue = new GitHubIssue(url);
      const fieldValues = [
        { field: { name: 'text-field' }, text: 'my text' },
        { field: { name: 'single-select' }, name: 'my selection' },
        { field: { name: 'start date' }, date: '2024-10-14' },
        { field: { name: 'start count' }, number: 103 },
      ];
      issue.handleFieldValues(fieldValues);
      expect(issue.fields.text_field).to.equal('my text');
      expect(issue.fields.single_select).to.equal('my selection');
      expect(issue.fields.start_date).to.be.a('date');
      expect(issue.fields.start_date.getDate()).to.equal(14);
      expect(issue.fields.start_date.getMonth()).to.equal(9);
      expect(issue.fields.start_date.getFullYear()).to.equal(2024);
      expect(issue.fields.start_count).to.equal(103);
    });
  });

  describe('parseDate', () => {
    it('should parse a date correctly', () => {
      const date = '2021-01-01T00:00:00Z';
      const expected = new Date(date);
      expect(GitHubIssue.parseDate(date)).to.deep.equal(expected);
    });

    it('should return null for an invalid date', () => {
      const date = 'invalid';
      expect(GitHubIssue.parseDate(date)).to.be.null;
    });
  });

  describe('mapFieldName', () => {
    it('should map field names correctly', () => {
      const fieldMap = {
        'Field Name': 'field_name',
        'Another-Field': 'another_field',
        'Yet_Another-Field': 'yet_another_field',
      };
      for (const [fieldName, expected] of Object.entries(fieldMap)) {
        expect(GitHubIssue.mapFieldName(fieldName)).to.equal(expected);
      }
    });
  });

  describe('mapFieldValue', () => {
    it('should map field values correctly', () => {
      const fieldMap = {
        [GitHubIssue.FieldType.Text]: 'text',
        [GitHubIssue.FieldType.Number]: 123,
        [GitHubIssue.FieldType.Date]: '2021-01-01',
        [GitHubIssue.FieldType.SingleSelect]: 'value',
        [GitHubIssue.FieldType.Iteration]: 'title (2021-01-01 - 1)',
      };
      for (const [fieldType, value] of Object.entries(fieldMap)) {
        const mappedValue = GitHubIssue.mapFieldValue(fieldType, value);
        if (fieldType === GitHubIssue.FieldType.Date) {
          expect(mappedValue).to.be.a('date');
          const isoDate = formatISO(mappedValue).substring(0, value.length);
          expect(isoDate).to.equal(value);
        } else {
          expect(mappedValue).to.equal(value);
        }
      }
    });
  });

  describe('addField', () => {
    it('should add a field correctly', () => {
      const url = '';
      const issue = new GitHubIssue(url);
      issue.addField('field1', 'value1', GitHubIssue.FieldType.Text);
      issue.addField('field2', 2, GitHubIssue.FieldType.Number);
      issue.addField('field3', '2024-07-23', GitHubIssue.FieldType.Date);
      expect(issue.fields.field1).to.equal('value1');
      expect(issue.fields.field2).to.equal(2);
      expect(issue.fields.field3).to.be.a('date');
      expect(issue.fields.field3.getMonth()).to.equal(6);
      expect(issue.fields.field3.getDate()).to.equal(23);
      expect(issue.fields.field3.getFullYear()).to.equal(2024);
    });

    it('should add a special field correctly', () => {
      const url = '';
      const issue = new GitHubIssue(url);

      issue.addField('title', 'value1', GitHubIssue.FieldType.Text);
      issue.addField('url', 'value2', GitHubIssue.FieldType.Text);
      issue.addField('number', 3, GitHubIssue.FieldType.Number);

      expect(issue.title).to.equal('value1');
      expect(issue.url).to.equal('value2');
      expect(issue.number).to.equal(3);
    });
  });

  describe('issueNumber', () => {
    it('should return the issue number if it is set', () => {
      // Given a URL with an issue number, and number property is set
      const url = 'http://example.com/issues/123';
      const issue = new GitHubIssue(url);
      issue.number = 456;
      expect(issue.issueNumber).to.equal(456);
    });

    it('should return the issue number', () => {
      // Given a URL with an issue number, and number property is not set
      const url = 'http://example.com/issues/123';
      const issue = new GitHubIssue(url);
      expect(issue.number).to.be.undefined;

      // When we access the issue number
      // Then it should return the issue number from the URL
      expect(issue.issueNumber).to.equal(123);
    });

    it('should return null if the issue number is not found', () => {
      // Given a URL with an issue number, and number property is not set
      const url = 'http://example.com';
      const issue = new GitHubIssue(url);
      expect(issue.number).to.equal(undefined);

      // When we access the issue number
      // Then it should return null
      expect(issue.issueNumber).to.be.null;
    });
  });
});
