import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { GitHubClient } from '../src/github/client.js';
import { GitHubGqlQuery } from '../src/github/graphql-query.js';
import { CustomLogger } from '../src/custom-logger.js';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('GitHubClient', () => {
  const githubConfig = {
    token: 'test-token',
    repoOwner: 'test-owner',
    repoName: 'test-repo',
    projectId: 'test-project-id',
    projectName: 'test-project-name',
  };
  let uut;
  let queryMock;
  let loggerMock;

  beforeEach(() => {
    queryMock = sinon.createStubInstance(GitHubGqlQuery);
    loggerMock = sinon.createStubInstance(CustomLogger);
    uut = new GitHubClient(githubConfig);
    uut.query = queryMock;
    uut.logger = loggerMock;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('fetchProjectId', () => {
    it('d1 - should fetch the project ID and set it in the configuration', async () => {
      const projectResponse = {
        repository: {
          projects: {
            nodes: [{ id: 'project-id' }],
          },
        },
      };

      queryMock.getProject.resolves(projectResponse.repository.projects.nodes[0]);

      await uut.fetchProjectId();

      expect(queryMock.getProject.calledOnce).to.be.true;
      expect(uut.config.projectId).to.equal('project-id');
    });
  });

  describe('fetchProjectItems', () => {
    it('p1 - should fetch all project items and log the results', async () => {
      const issuesResponse = {
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
      };

      queryMock._getIssues.resolves(issuesResponse);

      queryMock.getIssues.resolves({
        nodes: issuesResponse.node.items.nodes,
        pageInfo: issuesResponse.node.items.pageInfo,
      });

      await uut.fetchProjectItems();

      expect(queryMock.getIssues.calledOnce).to.be.true;
      expect(queryMock.getIssues.firstCall.args).to.deep.equal([null, 50]);
      expect(uut.epicIssues).to.have.lengthOf(1);
      expect(uut.epicIssues[0].url).to.equal('url1');
    });

    it('p2 - should fetch multiple pages of project items', async () => {
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

      const firstReturnValue = {
        nodes: firstPageResponse.data.node.items.nodes,
        pageInfo: firstPageResponse.data.node.items.pageInfo,
      };

      const secondReturnValue = {
        nodes: secondPageResponse.data.node.items.nodes,
        pageInfo: secondPageResponse.data.node.items.pageInfo,
      };

      queryMock.getIssues.onFirstCall().resolves(firstReturnValue);
      queryMock.getIssues.onSecondCall().resolves(secondReturnValue);

      await uut.fetchProjectItems();

      expect(queryMock.getIssues.calledTwice).to.be.true;
      expect(queryMock.getIssues.firstCall.args).to.deep.equal([null, 50]);
      expect(queryMock.getIssues.secondCall.args).to.deep.equal(['cursor1', 50]);
      expect(uut.epicIssues).to.have.lengthOf(1);
      expect(uut.epicIssues[0].url).to.equal('url1');
    });
  });

  describe('fetchIssue', () => {
    it('i1 - should return the issue from the epic issues list', async () => {
      const issue = { issueNumber: 1 };
      uut.epicIssues = [issue];

      const result = await uut.fetchIssue(1);

      expect(result).to.equal(issue);
      expect(queryMock.getIssue.called).to.be.false;
    });

    it('i2 - should fetch the issue from GitHub if not in the list', async () => {
      const url = `https://github.com/${githubConfig.repoOwner}/${githubConfig.repoName}/issues/1`;
      const issueResponse = {
        repository: {
          issue: {
            url,
            projectItems: {
              nodes: [
                {
                  fieldValues: { nodes: [{ name: 'Epic', field: { name: 'Issue Type' } }] },
                },
              ],
            },
          },
        },
      };

      const res = {
        item: issueResponse.repository.issue,
        fields: issueResponse.repository.issue.projectItems.nodes[0],
      };
      queryMock.getIssue.resolves(res);

      const result = await uut.fetchIssue(1);

      expect(result.url).to.equal(url);
    });
  });

  describe('getIssue', () => {
    it('s1 - should return the issue from the epic issues list', () => {
      const issue = { issueNumber: 1 };
      uut.epicIssues = [issue];

      expect(uut.getIssue(1)).to.equal(issue);
    });

    it('s2 - should return undefined if the issue is not in the list', () => {
      uut.epicIssues = [{ issueNumber: 1 }];

      expect(uut.getIssue(2)).to.be.undefined;
    });
  });
});
