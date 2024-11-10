import { expect } from 'chai';
import { GraphQLClient } from 'graphql-request';
import fs from 'fs';
import path from 'path';
import GitHubGqlClient from '../src/github/graphql-client.js';
import { PathUtil } from '../src/path-util.js';

describe('GitHubGqlClient - Integration Test', () => {
  let uut;
  const config = JSON.parse(fs.readFileSync(PathUtil.CONFIG_FILE_PATH, 'utf8'));
  const tokenPath = PathUtil.expandHomeDir(config.github.tokenPath); // Expand token path
  const token = fs.readFileSync(tokenPath, 'utf8').trim(); // Read the token from the file
  const queryName = '.$$graphql-client.integration.test.query';
  const queryString = 'query { viewer {login} }';
  const variables = { test: 'variable' };
  const gqlDirPath = PathUtil.getPath(PathUtil.PathName.GRAPHQL);
  const gqlFilePath = PathUtil.getPath(PathUtil.PathName.GRAPHQL, `${queryName}.graphql`);

  before(() => {
    expect(fs.existsSync(gqlDirPath)).to.be.true;
    // Verify that the token is set
    if (!token) throw new Error('GitHub token not found in the specified file.');
    fs.writeFileSync(gqlFilePath, queryString);
  });

  after(() => {
    fs.unlinkSync(gqlFilePath);
  });

  beforeEach(() => {
    uut = new GitHubGqlClient(token);
  });

  describe('query', function () {
    this.slow(5000);
    it('should send a query request and return data', async () => {
      // Run a real query against GitHub's API
      const result = await uut.query(queryName, variables);
      expect(result).to.have.property('viewer');
      expect(result.viewer).to.have.property('login');
    });
  });
});
