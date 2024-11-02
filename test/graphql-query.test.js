import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import sinon from 'sinon';
import { GraphQLClient } from 'graphql-request';
import { GitHubGqlQuery } from '../src/github/graphql-query.js';

describe('GitHubGqlQuery', () => {
  let githubConfig;
  let gqlQuery;
  let clientMock;

  beforeEach(() => {
    githubConfig = {
      token: 'test-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo',
      projectId: 'test-project-id',
    };

    clientMock = {
      query: sinon.stub(),
    };

    gqlQuery = new GitHubGqlQuery(githubConfig);
    gqlQuery.client = clientMock;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('issue', () => {
    it('should fetch issue data from GitHub', async () => {
      const issueNumber = 123;
      const expectedData = { data: { issue: { id: 'issue-id', number: issueNumber } } };
      clientMock.query.resolves(expectedData);

      const result = await gqlQuery.issue(issueNumber);

      expect(clientMock.query.calledOnce).to.be.true;
      expect(clientMock.query.firstCall.args[1]).to.deep.equal({
        owner: githubConfig.repoOwner,
        name: githubConfig.repoName,
        issueNumber,
      });

      expect(result).to.deep.equal(expectedData);
    });

    it('should throw an error if the query fails', async () => {
      const issueNumber = 123;
      clientMock.query.rejects(new Error('Query failed'));

      try {
        await gqlQuery.issue(issueNumber);
        throw new Error('Test failed');
      } catch (err) {
        expect(err.message).to.equal('Query failed');
      }
    });
  });
});
