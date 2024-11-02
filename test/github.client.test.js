import { expect } from 'chai';
import sinon from 'sinon';
import { GitHubClient } from '../src/github/client.js';
import { GitHubGqlQuery } from '../src/github/graphql-query.js';
import { CustomLogger } from '../src/custom-logger.js';

describe('GitHubClient', () => {
  const githubConfig = {
    token: 'test-token',
    repoOwner: 'test-owner',
    repoName: 'test-repo',
    projectId: 'test-project-id',
    projectName: 'test-project-name',
  };
  let client;
  let queryMock;
  let loggerMock;

  beforeEach(() => {
    queryMock = sinon.createStubInstance(GitHubGqlQuery);
    loggerMock = sinon.createStubInstance(CustomLogger);
    client = new GitHubClient(githubConfig);
    client.query = queryMock;
    client.logger = loggerMock;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('fetchProjectItems', () => {
    it('should fetch all project items and log the results', async () => {
      const issuesResponse = {
        data: {
          node: {
            items: {
              nodes: [
                {
                  content: { url: 'url1', number: 1 },
                  fieldValues: { nodes: [{ name: 'Epic', field: { name: 'Issue Type' } }] },
                },
                {
                  content: { url: 'url2', number: 2 },
                  fieldValues: { nodes: [{ name: 'Task', field: { name: 'Issue Type' } }] },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'cursor' },
            },
          },
        },
      };

      queryMock.issues.resolves(issuesResponse);
      queryMock.handleIssuesResponse.returns({
        nodes: issuesResponse.data.node.items.nodes,
        pageInfo: issuesResponse.data.node.items.pageInfo,
      });

      await client.fetchProjectItems();

      expect(queryMock.issues.calledOnce).to.be.true;
      expect(queryMock.issues.firstCall.args).to.deep.equal([null, 50]);
      expect(client.epicIssues).to.have.lengthOf(1);
      expect(client.epicIssues[0].url).to.equal('url1');
    });

    it('should fetch multiple pages of project items', async () => {
      const firstPageResponse = {
        data: {
          node: {
            items: {
              nodes: [
                {
                  content: { url: 'url1', number: 1 },
                  fieldValues: { nodes: [{ name: 'Epic', field: { name: 'Issue Type' } }] },
                },
              ],
              pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
            },
          },
        },
      };

      const secondPageResponse = {
        data: {
          node: {
            items: {
              nodes: [
                {
                  content: { url: 'url2', number: 2 },
                  fieldValues: { nodes: [{ name: 'Task', field: { name: 'Issue Type' } }] },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: 'cursor2' },
            },
          },
        },
      };

      queryMock.issues.onFirstCall().resolves(firstPageResponse);
      queryMock.issues.onSecondCall().resolves(secondPageResponse);
      queryMock.handleIssuesResponse.onFirstCall().returns({
        nodes: firstPageResponse.data.node.items.nodes,
        pageInfo: firstPageResponse.data.node.items.pageInfo,
      });
      queryMock.handleIssuesResponse.onSecondCall().returns({
        nodes: secondPageResponse.data.node.items.nodes,
        pageInfo: secondPageResponse.data.node.items.pageInfo,
      });

      await client.fetchProjectItems();

      expect(queryMock.issues.calledTwice).to.be.true;
      expect(queryMock.issues.firstCall.args).to.deep.equal([null, 50]);
      expect(queryMock.issues.secondCall.args).to.deep.equal(['cursor1', 50]);
      expect(client.epicIssues).to.have.lengthOf(1);
      expect(client.epicIssues[0].url).to.equal('url1');
    });
  });
});
