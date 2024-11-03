import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import sinon from 'sinon';
import { GraphQLClient } from 'graphql-request';
import { GitHubGqlQuery } from '../src/github/graphql-query.js';

describe('GitHubGqlQuery', () => {
  const githubConfig = {
    token: 'test-token',
    repoOwner: 'test-owner',
    repoName: 'test-repo',
    projectId: 'test-project-id',
  };
  let uut;
  let clientMock;

  beforeEach(() => {
    clientMock = {
      query: sinon.stub(),
    };

    uut = new GitHubGqlQuery(githubConfig);
    uut._ghGqlClient = clientMock;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('issue', () => {
    it('a1 - should fetch issue data from GitHub', async () => {
      const issueNumber = 123;
      const expectedData = { data: { issue: { id: 'issue-id', number: issueNumber } } };
      clientMock.query.resolves(expectedData);

      const result = await uut.issue(issueNumber);

      expect(clientMock.query.calledOnce).to.be.true;
      expect(clientMock.query.firstCall.args[1]).to.deep.equal({
        owner: githubConfig.repoOwner,
        name: githubConfig.repoName,
        issueNumber,
      });

      expect(result).to.deep.equal(expectedData);
    });

    it('a2 - should throw an error if the query fails', async () => {
      const issueNumber = 123;
      clientMock.query.rejects(new Error('Query failed'));

      try {
        await uut.issue(issueNumber);
        throw new Error('Test failed');
      } catch (err) {
        expect(err.message).to.equal('Query failed');
      }
    });
  });

  describe('issues', () => {
    it('b1 - should fetch issues data from GitHub', async () => {
      const afterCursor = 'test-cursor';
      const pageSize = 50;
      const expectedData = {
        data: {
          issues: { nodes: [{ id: 'issue-id' }], pageInfo: { afterCursor, hasNextPage: true } },
        },
      };
      clientMock.query.resolves(expectedData);

      const result = await uut.issues(afterCursor, pageSize);

      expect(clientMock.query.calledOnce).to.be.true;
      expect(clientMock.query.firstCall.args[1]).to.deep.equal({
        projectId: githubConfig.projectId,
        afterCursor,
        pageSize,
      });

      expect(result).to.deep.equal(expectedData);
    });
  });

  describe('project', () => {
    it('p1 - should fetch project data from GitHub', async () => {
      const expectedData = { data: { project: { id: 'project-id' } } };
      clientMock.query.resolves(expectedData);

      const result = await uut.project();

      expect(clientMock.query.calledOnce).to.be.true;

      const { repoOwner, repoName } = clientMock.query.firstCall.args[1];
      const variables = { repoOwner, repoName };
      expect(variables).to.deep.equal({
        repoOwner: githubConfig.repoOwner,
        repoName: githubConfig.repoName,
      });

      expect(result).to.deep.equal(expectedData);
    });
  });
});
