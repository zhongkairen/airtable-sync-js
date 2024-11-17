import { expect } from 'chai';
import { GitHubConfig } from '../src/config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('GitHubConfig - Integration Test', () => {
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

      testVars.expectedToken = fs.readFileSync(testVars.tokenPath, 'utf8');
    });

    after(() => {
      // Cleanup code after the test suite runs
      fs.unlinkSync(testVars.tokenPath);
    });

    afterEach(() => {
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN_PATH;
    });

    it('should initialize with token from environment variable', () => {
      process.env.GITHUB_TOKEN = 'test-token-value';
      const configJson = {};
      const githubConfig = new GitHubConfig(configJson);
      expect(githubConfig.token).to.equal('test-token-value');
    });

    it('should initialize token with token path from environment variable', () => {
      const { tokenPath } = testVars;
      process.env.GITHUB_TOKEN_PATH = tokenPath;
      const configJson = {};
      const githubConfig = new GitHubConfig(configJson);
      expect(githubConfig.token).to.equal(testVars.expectedToken);
    });

    it('should initialize with token from configJson', () => {
      const configJson = { token: 'config-token-value' };
      const githubConfig = new GitHubConfig(configJson);
      expect(githubConfig.token).to.equal('config-token-value');
    });

    it('should initialize token with token path from configJson', () => {
      const { tokenPath } = testVars;
      const configJson = { tokenPath: tokenPath };
      const githubConfig = new GitHubConfig(configJson);
      expect(githubConfig.token).to.equal(testVars.expectedToken);
    });

    it('should initialize with other configuration values from configJson', () => {
      process.env.GITHUB_TOKEN_PATH = testVars.tokenPath;
      const configJson = {
        projectName: 'test-project-name',
        repoName: 'test-repo-name',
        repoOwner: 'test-owner-name',
        fieldMap: { 'test-field': 'test-value' },
      };
      const githubConfig = new GitHubConfig(configJson);
      expect(githubConfig.projectName).to.equal('test-project-name');
      expect(githubConfig.repoName).to.equal('test-repo-name');
      expect(githubConfig.repoOwner).to.equal('test-owner-name');
      expect(githubConfig.fieldMap).to.deep.equal({ 'test-field': 'test-value' });
    });

    it('should throw an error if neither token nor token path is set', () => {
      expect(() => new GitHubConfig({})).to.throw(Error);
    });
  });
});
