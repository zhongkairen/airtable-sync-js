import { expect, assert } from 'chai';
import fs from 'fs';
import { PathUtil, $path } from '../src/path-util.js';
import { exec } from 'child_process';
import { AirtableClient } from './helper/at-client.js';
import { GitHubClient } from './helper/gh-client.js';
import { getRandomDateString } from './helper/utils.js';
import exp from 'constants';

describe('airtable-sync-js - End-to-end Test', function () {
  // Enable exit-on-first-fail for this test suite
  this.bail(true);
  this.slow(200);
  this.timeout(18000);

  let airtableClient;
  let githubClient;
  let config;
  const configFile = 'e2e.config.json';
  const configPath = $path`test/${configFile}`;
  const currentValues = [];
  const updatedValues = [];
  let stdOut = '';
  let stdError = '';
  let debug = false;

  before(function () {
    // Set the debug flag
    debug = process.argv.includes('--debug') || process.argv.includes('-d');
  });

  beforeEach(function () {
    stdOut = '';
    stdError = '';
  });

  afterEach(function () {
    if (stdError) console.error(`ERROR: ${stdError}`);
    if (stdOut) console.log(stdOut);
  });

  it('1 - Prepare clients', function () {
    // Download integration test configuration
    const gistId = '';

    // todo - Download the configuration file
    // const configFile = downloadGist(gistId, gistFile);

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
  });

  it('2a - Query Github project ID ...', async function () {
    // Fetch
    const projectId = await githubClient.queryProjectId();
    // console.debug('projectId:', projectId);
    expect(projectId).to.be.a('string');
    expect(projectId).to.have.lengthOf.at.least(10);
    expect(projectId.startsWith('PVT_')).to.be.true;
    if (debug) stdOut = `Project ID: ${projectId}`;
  });

  it('2b - Query field IDs ...', async function () {
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
    await Promise.all(
      updatedValues.map(({ issueNumber, fieldValues }) => {
        return githubClient.queryIssueAndProjectItem(issueNumber);
      })
    );

    const ids = updatedValues.reduce((acc, updatedValue) => {
      const { issueNumber } = updatedValue;
      const { issueId, projectItemId } = githubClient.issues[issueNumber];
      acc[issueNumber] = { issueId, projectItemId };
      updatedValue.issueId = issueId;
      updatedValue.projectItemId = projectItemId;
      return acc;
    }, {});

    // if (debug) stdOut = JSON.stringify(ids, null, 2);
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

  it('6 - Verify GitHub issue fields have new values ...', async function () {
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

  it('7 - Sync records ...', async function () {
    this.timeout(20000);
    const command = `node --no-warnings src/index.js --config ${configPath} ${debug ? '-v' : ''}`;
    const options = { cwd: PathUtil.dir.packageRoot };
    await new Promise((resolve, reject) => {
      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return reject(error);
        }

        stdOut = stdout;
        stdError = stderr;
        resolve();
      });
    });
  });

  it('8 - Read updated records ...', async function () {
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

  it('9 - Verify values', function () {
    updatedValues.forEach((updatedValue) => {
      updatedValue.fieldValues.forEach((fieldValue) => {
        const { github, airtable } = fieldValue;
        const context = `${updatedValue.issueNumber}: '${github.field}' -> '${airtable.field}'`;
        expect(github.value, context).to.equal(airtable.value);
      });
    });
  });
});
