import { expect, assert } from 'chai';
import fs from 'fs';
import { PathUtil, $path } from '../src/path-util.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AirtableClient } from './helper/at-client.js';
import { GitHubClient } from './helper/gh-client.js';
import { getRandomDateString } from './helper/utils.js';
import exp from 'constants';

const execAsync = promisify(exec);

describe('airtable-sync-js - End-to-end Test', function () {
  // Enable exit-on-first-fail for this test suite
  this.bail(true);
  this.slow(200);
  this.timeout(18000);

  let airtableClient;
  let githubClient;
  let config;
  const configPath = $path`test/sync.e2e.config.json`;
  const cachePath = $path`test/sync.e2e.cache.json`;
  const currentValues = [];
  const updatedValues = [];
  let stdOut = '';
  let stdError = '';
  let statusText = '';
  let debug = false;

  before(function () {
    // Set the debug flag
    debug = process.argv.includes('--debug') || process.argv.includes('-d');
  });

  beforeEach(function () {
    stdOut = '';
    stdError = '';
    statusText = '';
  });

  afterEach(function () {
    if (statusText) {
      const testTitle = this.currentTest.title;
      const padding = 7;
      process.stdout.write(' '.repeat(testTitle.length + padding) + `\x1b[1A${statusText}\n`);
    }
    if (stdError) console.error(`ERROR: ${stdError}`);
    if (stdOut) console.log(stdOut);
  });

  it('1 - Prepare clients', function () {
    // Parse the configuration file
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    airtableClient = new AirtableClient(config.airtable);
    githubClient = new GitHubClient(config.github);

    assert(airtableClient.token, 'Airtable token is not set');
    assert(
      airtableClient.token.length > 10,
      'Airtable token is too short (must be at least 11 characters)'
    );
    assert(githubClient.token, 'GitHub token is not set');
    assert(
      githubClient.token.length > 10,
      'GitHub token is too short (must be at least 11 characters)'
    );

    if (fs.existsSync(cachePath)) {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      githubClient.cache = cache;
    }
  });

  it('2a - Query Github project ID ...', async function () {
    if (githubClient.cache.projectId) {
      statusText = `(skipped: using cache)`;
      if (debug) stdOut = `Project ID: ${githubClient.cache.projectId}`;
      this.skip();
    }
    const projectId = await githubClient.queryProjectId();
    expect(projectId).to.be.a('string');
    expect(projectId).to.have.lengthOf.at.least(10);
    expect(projectId.startsWith('PVT_')).to.be.true;
    if (debug) stdOut = `Project ID: ${projectId}`;
  });

  it('2b - Query field IDs ...', async function () {
    if (Object.keys(githubClient.cache.fieldIds).length > 0) {
      statusText = `(skipped: using cache)`;
      if (debug) stdOut = JSON.stringify(githubClient.cache.fieldIds, null, 2);
      this.skip();
    }
    const fieldMapping = await githubClient.queryFieldIds();
    if (debug) stdOut = JSON.stringify(fieldMapping, null, 2);
  });

  it('3 - Read records ...', async function () {
    const records = await airtableClient.readRecords();

    // Get the current values of the fields to be synced
    const currentFieldValues = records.reduce((acc, record) => {
      const fields = record.fields;
      const issueNumber = fields['Issue Number'];
      const fieldValues = Object.entries(config.github.fieldMap).reduce(
        (acc, [githubField, airtableField]) => {
          const value = fields[airtableField];
          acc.push({ github: { field: githubField }, airtable: { field: airtableField, value } });
          return acc;
        },
        []
      );
      acc.push({ issueNumber, fieldValues });
      return acc;
    }, []);

    currentValues.push(...currentFieldValues);

    const issueNumbers = currentFieldValues.map(({ issueNumber }) => issueNumber);
    expect(records.length).to.be.above(1);
    if (debug) stdOut = `${records.length} records, issue numbers: ${issueNumbers.join(', ')}`;
  });

  it('4 - Generate new field values', function () {
    // Generate new values, which are different from the current values
    updatedValues.push(...currentValues.map((value) => structuredClone(value)));
    updatedValues.forEach((current) => {
      const issueNumber = current.issueNumber;
      const fieldValues = current.fieldValues.map((fieldValue) => {
        const { github, airtable } = fieldValue;
        const value = getRandomDateString(airtable.value);
        const field = github.field;
        return { github: { field, value }, airtable };
      });
      current.fieldValues = fieldValues;
    }); // for each
    if (debug) stdOut = JSON.stringify(updatedValues, null, 2);
  });

  it('4a - Query issue project item IDs ...', async function () {
    const processIds = () => {
      updatedValues.forEach((updatedValue) => {
        const { issueNumber } = updatedValue;
        const projectItemId = githubClient.getProjectItem(issueNumber);
        updatedValue.projectItemId = projectItemId;
        expect(projectItemId).to.be.a('string');
        expect(projectItemId).to.have.lengthOf.at.least(10);
        expect(projectItemId.startsWith('PVTI_')).to.be.true;
      });

      if (debug) {
        const ids = updatedValues.map((updatedValue) => {
          const { issueNumber, projectItemId } = updatedValue;
          return { issueNumber, projectItemId };
        });
        stdOut = JSON.stringify(ids, null, 2);
      }
    };

    if (Object.keys(githubClient.cache.projectItemIds).length > 0) {
      statusText = `(skipped: using cache)`;
      processIds();
      this.skip();
    } else {
      await githubClient.queryIssueAndProjectItem();
      processIds();
    }
  });

  it('5 - Update GitHub issue fields to new values ...', async function () {
    const results = await githubClient.updateFieldsParallel(updatedValues);
    results.forEach((result) => {
      const { success, issueNumber, field, data } = result;
      const context = `issue ${issueNumber} '${field.github.field}' -> '${field.github.value}'`;
      if (!success) {
        const message = data.errors
          ? data.errors.map(({ message }) => message).join(', ')
          : JSON.stringify(data);
        stdError = `Failed to update ${context}. ${message}`;
      }
      expect(success, context).to.be.true;
    });
  });

  it('5a - Verify GitHub issue fields have new values ...', async function () {
    this.timeout(12000);
    const issues = await githubClient.readIssues();
    issues.forEach((issue) => {
      const issueNumber = issue.content.number;
      const updatedValue = updatedValues.find((item) => item.issueNumber === issueNumber);
      updatedValue.fieldValues.forEach((fieldValue) => {
        const { github, airtable } = fieldValue;
        const context = `${updatedValue.issueNumber}: '${github.field}' -> '${airtable.field}'`;
        const issueFields = issue.fieldValues.nodes;
        const issueField = issueFields.find((field) => field?.field?.name === github.field);
        const issueValue = issueField?.date;
        expect(issueValue, context).to.equal(github.value);
      });
    });
  });

  it('6 - Sync records ...', async function () {
    this.timeout(20000);
    const command = `node --no-warnings src/index.js --config ${configPath} ${debug ? '-v' : ''}`;
    const options = { cwd: PathUtil.dir.packageRoot };
    const { stdout, stderr } = await execAsync(command, options);
    if (debug) stdOut = stdout;
    stdError = stderr;
  });

  it('7 - Read updated records ...', async function () {
    this.timeout(120000);
    const records = await airtableClient.readRecords();

    records.forEach((record) => {
      const issueNumber = record.fields['Issue Number'];
      const updatedValue = updatedValues.find((issue) => issue.issueNumber === issueNumber);
      updatedValue.fieldValues.forEach((fieldValue) => {
        const { github, airtable } = fieldValue;
        fieldValue.airtable.value = record.fields[airtable.field];
      });
    });
  });

  it('8 - Verify values', function () {
    updatedValues.forEach((updatedValue) => {
      updatedValue.fieldValues.forEach((fieldValue) => {
        const { github, airtable } = fieldValue;
        const context = `${updatedValue.issueNumber}: '${github.field}' -> '${airtable.field}'`;
        expect(github.value, context).to.equal(airtable.value);
      });
    });
  });

  it('9 - Save cache', async function () {
    if (fs.existsSync(cachePath)) {
      statusText = '(skipped: cache exists)';
      this.skip();
    }
    fs.writeFileSync(cachePath, JSON.stringify(githubClient.cache, null, 2));
    expect(fs.existsSync(cachePath)).to.be.true;
  });
});
