import { parse, isDate } from 'date-fns'; // Use a date library for parsing
import { parseISO, isValid } from 'date-fns';
import { URL } from 'url';
import { CustomLogger } from '../custom-logger.js'; // Adjust the path as necessary

const logger = new CustomLogger(import.meta.url);

const FieldType = {
  Text: 'TEXT',
  Number: 'NUMBER',
  Date: 'DATE',
  SingleSelect: 'SINGLE_SELECT',
  Iteration: 'ITERATION',
};

/**
 * Represents a GitHub issue.
 */
class GitHubIssue {
  static FieldType = FieldType;

  static parseDate(dateStr) {
    const date = parseISO(dateStr);
    if (isValid(date)) return date;
    return null;
  }

  static mapFieldName(fieldName) {
    return fieldName.toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
  }

  static mapFieldValue(fieldType, value) {
    if (fieldType === FieldType.Date) {
      return GitHubIssue.parseDate(value);
    }
    return value;
  }

  constructor(url) {
    this.url = url;
    this.title = undefined;
    this.body = undefined;
    this.number = undefined;
    this.fields = {};
  }

  get isEpic() {
    const issueType = this.fields['issue_type'] || '';
    const cleanedIssueType = issueType.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    return cleanedIssueType === 'Epic';
  }

  get issueNumber() {
    if (this.number != null) return this.number;

    const match = (this.url ??= '').match(/\/issues\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  loadFields(baseData, fields) {
    const fieldValues = fields.fieldValues.nodes;
    this.url = baseData.url || this.url;
    this.title = baseData.title;
    this.body = baseData.body;
    this.number = baseData.number;
    this.handleFieldValues(fieldValues);
  }

  toString() {
    const body = this.body ? this.body.trim().split('\n')[0].slice(0, 50) : '';
    const lines = [];

    for (const attr in this) {
      if (['url', 'title', 'body'].includes(attr)) {
        const val = attr === 'body' ? body : this[attr];
        lines.push(`${attr}: ${val}`);
      }
    }

    for (const [name, value] of Object.entries(this.fields)) {
      lines.push(`${name}: ${value}`);
    }

    const indent = '  ';
    return lines.map((line) => `${indent}${line}`).join('\n');
  }

  handleFieldValues(fieldValues) {
    for (const fieldValue of fieldValues) {
      // const field = fieldValue.field || {};
      const { field = {} } = fieldValue;
      const fieldName = field.name;
      let fieldType = FieldType.Text;
      let value;

      if (!fieldName) {
        continue;
      }

      if ('text' in fieldValue) {
        fieldType = FieldType.Text;
        value = fieldValue.text;
      } else if ('duration' in fieldValue && 'startDate' in fieldValue && 'title' in fieldValue) {
        fieldType = FieldType.Iteration;
        value = `${fieldValue.title} (${fieldValue.startDate} - ${fieldValue.duration})`;
      } else if ('number' in fieldValue) {
        fieldType = FieldType.Number;
        value = fieldValue.number;
      } else if ('date' in fieldValue) {
        fieldType = FieldType.Date;
        value = fieldValue.date;
      } else if ('name' in fieldValue) {
        fieldType = FieldType.SingleSelect;
        value = fieldValue.name;
      } else {
        logger.warn(`unknown field type: ${fieldValue}`);
        value = null;
      }

      this.addField(fieldName, value, fieldType);
    }
  }

  addField(fieldName, value, fieldType) {
    const name = GitHubIssue.mapFieldName(fieldName);
    if (['title', 'url', 'number'].includes(name)) {
      this[name] = value;
    } else {
      this.fields[name] = GitHubIssue.mapFieldValue(fieldType, value);
    }
  }
}

export { GitHubIssue };
