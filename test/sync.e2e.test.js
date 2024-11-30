import { expect } from 'chai';
import fs from 'fs';
import { PathUtil, $path } from '../src/path-util.js';
import { exec } from 'child_process';
import { AirtableClient } from './helper/at-client.js';
import { GitHubClient } from './helper/gh-client.js';
import { getRandomDateString } from './helper/utils.js';

describe('airtable-sync-js - End-to-end Test', function () {
  // Enable exit-on-first-fail for this test suite
  this.bail(true);

  let airtableClient;
  let githubClient;
  let config;
  const configFile = 'e2e.config.json';
  const configPath = $path`test/${configFile}`;
  const currentValues = [];
  const updatedValues = [];
  let stdOut = '';
  let stdError = '';

  beforeEach(function () {
    stdOut = '';
    stdError = '';
  });

  afterEach(function () {
    if (stdError) console.error(`stderr: ${stdError}`);
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
  });

  it('4a - Query Github project ID ...', async function () {
    this.slow(5000);
    this.timeout(8000);
    // Fetch
    const projectId = await githubClient.queryProjectId();
    // console.debug('projectId:', projectId);
    expect(projectId).to.be.a('string');
    expect(projectId).to.have.lengthOf.at.least(10);
    expect(projectId.startsWith('PVT_')).to.be.true;
    stdOut = `Project ID: ${projectId}`;
  });

  it('4b - Query field IDs ...', async function () {
    this.slow(5000);
    this.timeout(8000);
    const fieldMapping = await githubClient.queryFieldIds();

    stdOut = JSON.stringify(fieldMapping, null, 2);
  });

  it('2 - Read records ...', async function () {
    this.slow(8000);
    this.timeout(12000);
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
    stdOut = `${records.length} records, issue numbers: ${issueNumbers.join(', ')}`;
  });

  it('3 - Generate new field values', function () {
    // Generate new values, which are different from the current values
    updatedValues.push(...currentValues.map((value) => structuredClone(value)));
    updatedValues.forEach((current) => {
      const issueNumber = current.issueNumber;
      const fieldValues = current.fieldValues.map((fieldValue) => {
        const { github, airtable } = fieldValue;
        const value = airtable.value;
        const newValue = (() => {
          let temp = value;
          for (; temp === value; temp = getRandomDateString());
          return temp;
        })();
        return { github, airtable: { field: airtable.field, value: newValue } };
      });
      current.fieldValues = fieldValues;
    }); // for each
  }); // ts3

  it('4c - Query issue IDs ...', async function () {
    this.slow(5000);
    this.timeout(8000);
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

    stdOut = JSON.stringify(ids, null, 2);
    // console.log(JSON.stringify(updatedValues, null, 2));
  });

  it('5 - Update GitHub issue fields to new values ...', async function () {
    this.slow(8000);
    this.timeout(12000);

    // console.debug('updatedValues:', JSON.stringify(updatedValues, null, 2));
    const result = await githubClient.updateFieldsParallel(updatedValues);
    console.debug('result:', JSON.stringify(result, null, 2));

    throw new Error('Early exit');
  });

  it('6 - Sync records ...', async function () {
    this.slow(15000);
    this.timeout(20000);
    const command = `node --no-warnings src/index.js --config ${configPath} -v`;
    const options = { cwd: PathUtil.dir.packageRoot };
    await new Promise((resolve, reject) => {
      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return reject(error);
        }

        stdOut = stdout;
        stdError = stderr;
        // console.log(`Stdout: ${stdout}`);

        // Add assertions here if needed, for example:
        // assert(stdout.includes('Expected output')); // Adjust to match your needs
        resolve();
      });
    });
  });

  it('7 - Read updated records ...', async function () {
    this.slow(8000);
    this.timeout(12000);
    await airtableClient.readRecords();
  });

  it('8 - Verify values', function () {
    airtableClient.records.forEach((record) => {
      const issueNumber = record.fields['Issue Number'];
      const updatedValue = updatedValues.find((issue) => issue.issueNumber === issueNumber);
      updatedValue.fieldValues.forEach((fieldValue) => {
        const { github, airtable } = fieldValue;
        expect(record.fields[airtable.field]).to.equal(github.value);
      });
    });
  });
});
