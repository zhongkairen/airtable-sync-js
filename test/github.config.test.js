import { expect } from 'chai';
import sinon from 'sinon';
import { GitHubConfig } from '../src/config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('GitHubConfig', () => {
  let mock;
  let uut;

  before(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    process.env.NODE_ENV = 'test';

    const mockUserToken = sinon.stub().callsFake((nameDict, configJson) => {
      const mockInstance = {
        token: configJson.token, // Simulate the token set in the constructor
        tokenPath: configJson.tokenPath,
        // Mock the read method and define the value getter
        read: sinon.stub().returnsThis(),
        get value() {
          return 'test-token-value'; // Return mocked value when 'value' is accessed
        },
      };

      return mockInstance;
    });

    mock = {
      UserToken: mockUserToken,
    };
  });

  after(() => {
    process.env.NODE_ENV = undefined;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should pass correct values to user token', () => {
      const configJson = {
        field1: 'value1',
      };
      const githubConfig = new GitHubConfig(configJson, mock);

      const args = mock.UserToken.args[0];

      // Validate the nameDict argument
      expect(args[0]).to.have.property('tokenEnv', 'GITHUB_TOKEN');
      expect(args[0]).to.have.property('tokenEnvPath', 'GITHUB_TOKEN_PATH');
      expect(args[0]).to.include({
        tokenEnv: 'GITHUB_TOKEN',
        tokenEnvPath: 'GITHUB_TOKEN_PATH',
        configToken: 'token',
        configTokenPath: 'tokenPath',
      });

      // Validate the configJson argument
      expect(args[1]).to.deep.equal(configJson);

      // Validate fields are set to the instance
      expect(githubConfig).to.have.property('field1', 'value1');
    });
  });

  describe('token', () => {
    it('should return from user token value', () => {
      mock.UserToken.returns({
        read: sinon.stub().returns({
          get value() {
            return 'test-token-value-1';
          },
        }),
      });

      const configJson = {};
      const githubConfig = new GitHubConfig(configJson, mock);
      expect(githubConfig.token).to.equal('test-token-value-1');
    });
  });
});
