import { expect } from 'chai';
import { GraphQLClient } from 'graphql-request';
import fs from 'fs';
import path from 'path';
import GitHubGqlClient from '../src/github/graphql-client.js';
import { PathUtil } from '../src/path-util.js';

describe('GitHubGqlClient - Integration Test', () => {
  let client;
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
    client = new GitHubGqlClient(token);
  });

  describe('_getQuery and _loadQuery', function () {
    this.slow(2000);
    it('a1 - should load query from file', () => {
      // Ensure the query file exists in the expected directory
      expect(fs.existsSync(gqlFilePath)).to.be.true;

      // Load the query and check content
      const gqlQuery = client._loadQuery(queryName);
      const queryContent = fs.readFileSync(gqlFilePath, 'utf8');
      expect(gqlQuery.loc.source.body.trim()).to.equal(queryContent.trim());
    });

    it('a2 - should cache loaded queries', () => {
      const firstCall = client._getQuery(queryName);
      const secondCall = client._getQuery(queryName);
      expect(firstCall).to.equal(secondCall);
    });
  });

  describe('_getQuery', function () {
    this.slow(5000);
    it('b1 - should send a query request and return data', async () => {
      // Run a real query against GitHub's API
      const result = await client.query(queryName, variables);
      expect(result).to.have.property('viewer');
      expect(result.viewer).to.have.property('login');
    });
  });
});
