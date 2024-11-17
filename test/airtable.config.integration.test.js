import { expect } from 'chai';
import { AirtableConfig } from '../src/config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('AirtableConfig - Integration Test', () => {
  describe('constructor', () => {
    const testVars = {
      tokenFile: '.pseudo-token',
      tokenPath: '/config/path',
      expectedToken: '',
    };
    before(() => {
      // Setup code before the test suite runs
      const homeDir = os.homedir();
      const scriptDir = path.dirname(new URL(import.meta.url).pathname);
      const sourcePath = path.join(scriptDir, testVars.tokenFile);
      testVars.tokenPath = path.join(homeDir, testVars.tokenFile);
      fs.copyFileSync(sourcePath, testVars.tokenPath);

      fs.readFile(testVars.tokenPath, 'utf8', (err, data) => {
        if (err) {
          throw err;
        }
        testVars.expectedToken = data;
      });
    });

    after(() => {
      fs.unlinkSync(testVars.tokenPath);
    });

    afterEach(() => {
      delete process.env.AIRTABLE_TOKEN;
      delete process.env.AIRTABLE_TOKEN_PATH;
    });

    it('c0 - should initialize with token from environment variable', () => {
      process.env.AIRTABLE_TOKEN = 'test-token-value';
      const configJson = {};
      const airtableConfig = new AirtableConfig(configJson);
      expect(airtableConfig.token).to.equal('test-token-value');
    });

    it('c1 - should initialize token with token path from environment variable', () => {
      const { tokenPath } = testVars;
      process.env.AIRTABLE_TOKEN_PATH = tokenPath;
      const configJson = {};
      const airtableConfig = new AirtableConfig(configJson);
      expect(airtableConfig.token).to.equal(testVars.expectedToken);
    });

    it('c2 - should initialize with token from configJson', () => {
      const configJson = { token: 'config-token-value' };
      const airtableConfig = new AirtableConfig(configJson);
      expect(airtableConfig.token).to.equal('config-token-value');
    });

    it('c3 - should initialize token with token path from configJson', () => {
      const { tokenPath } = testVars;
      const configJson = { tokenPath: tokenPath };
      const airtableConfig = new AirtableConfig(configJson);
      expect(airtableConfig.token).to.equal(testVars.expectedToken);
    });

    it('c4 - should initialize with other configuration values from configJson', () => {
      process.env.AIRTABLE_TOKEN_PATH = testVars.tokenPath;
      const configJson = {
        baseId: 'test-base-id',
        tableName: 'test-table-name',
        viewName: 'test-view-name',
      };
      const airtableConfig = new AirtableConfig(configJson);
      expect(airtableConfig.baseId).to.equal('test-base-id');
      expect(airtableConfig.tableName).to.equal('test-table-name');
      expect(airtableConfig.viewName).to.equal('test-view-name');
    });

    it('c5 - should throw an error if neither token nor token path is set', () => {
      expect(() => new AirtableConfig({})).to.throw(Error);
    });
  });
});
