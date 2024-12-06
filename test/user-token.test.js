import { expect } from 'chai';
import { UserToken } from '../src/user-token.js';

describe('UserToken', () => {
  describe('constructor', () => {
    it('should initialize with tokenEnv from environment variable', () => {
      process.env.TEST_TOKEN = 'test-token-value';
      const userToken = new UserToken({ tokenEnv: 'TEST_TOKEN' }, {});
      expect(userToken.token).to.equal('test-token-value');
      delete process.env.TEST_TOKEN;
    });

    it('should initialize with tokenEnvPath from environment variable', () => {
      process.env.TEST_TOKEN_PATH = '/test/path';
      const userToken = new UserToken({ tokenEnvPath: 'TEST_TOKEN_PATH' }, {});
      expect(userToken.tokenPath).to.equal('/test/path');
      delete process.env.TEST_TOKEN_PATH;
    });

    it('should initialize with token from fallback config', () => {
      const fallback = { configToken: 'fallback-token-value' };
      const userToken = new UserToken({ configToken: 'configToken' }, fallback);
      expect(userToken.token).to.equal('fallback-token-value');
    });

    it('should initialize with token path from fallback config', () => {
      const fallback = { configTokenPath: '/fallback/path' };
      const userToken = new UserToken({ configTokenPath: 'configTokenPath' }, fallback);
      expect(userToken.tokenPath).to.equal('/fallback/path');
    });

    it('should throw an error if neither token nor token path is set', () => {
      expect(
        () => new UserToken({ token: 'NON_EXISTENT_TOKEN', tokenPath: 'NON_EXISTENT_PATH' }, {})
      ).to.throw(Error);
    });
  });
});
