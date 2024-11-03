import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import { GitHubClient } from '../src/github/client.js';
import { GitHubGqlQuery } from '../src/github/graphql-query.js';
import { CustomLogger } from '../src/custom-logger.js';
import { PathUtil } from '../src/path-util.js';

describe('GitHubClient - Integration Test', () => {
  const config = JSON.parse(fs.readFileSync(PathUtil.CONFIG_FILE_PATH, 'utf8'));
  const githubConfig = config.github;
  const tokenPath = PathUtil.expandHomeDir(config.github.tokenPath); // Expand token path
  const token = fs.readFileSync(tokenPath, 'utf8').trim();
  githubConfig.token = token;
  const projectId = 'PVT_kwHOBlUv_s4AqLjV'; // airtable-sync - Airtable Sync
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let uut;
  let queryMock;
  let loggerMock;
  let epicIssues;

  beforeEach(() => {
    loggerMock = sinon.createStubInstance(CustomLogger);
    uut = new GitHubClient(githubConfig);
    uut.logger = loggerMock;
  });

  afterEach(() => {
    sinon.restore();
    delay(1000); // Delay to prevent GitHub API rate limiting
  });

  describe('fetchProjectId', function () {
    this.slow(3000);
    this.timeout(5000);
    it('a1 - should fetch the project ID and set it in the configuration', async () => {
      // Given the project ID is not set
      expect(uut.config.projectId).to.be.undefined;

      // When fetching the project ID
      await uut.fetchProjectId();

      // Then the project ID should be set
      expect(uut.config.projectId).to.equal(projectId);
    });
  }); // method fetchProjectId

  describe('fetchProjectItems', function () {
    this.slow(3000);
    this.timeout(5000); // Increase timeout for this test suite as there are so many issues to fetch
    it('b1 - should fetch all project items and log the results', async function () {
      // Given project ID already set
      uut.config.projectId = projectId;
      const pageSize = 50;
      const pageLimit = 1;

      // When fetching project items
      await uut.fetchProjectItems(pageSize, pageLimit);

      // Then the epic issues should be set
      expect(uut.epicIssues).to.have.lengthOf.at.least(1);
      const { url } = uut.epicIssues[Math.floor(Math.random() * uut.epicIssues.length)];
      expect(url).to.have.string(githubConfig.repoOwner);
      expect(url).to.have.string(githubConfig.repoName);
      expect(url).to.match(/https:\/\/github\.com\/.*\/.*\/issues\/\d+/);
      // For other test cases
      epicIssues = uut.epicIssues;
    });

    it('b2 - should fetch multiple pages of project items', async function () {
      // Given project ID already set
      uut.config.projectId = projectId;

      const pageSize = 4;
      const pageLimit = 3;
      // When fetching project items with a small page size
      await uut.fetchProjectItems(pageSize, pageLimit);

      // Then more than 1 page of epic issues should be loaded
      expect(uut.epicIssues).to.have.lengthOf.at.least(pageSize + 1);
      // Then the issue numbers should be unique
      const issueNumbers = uut.epicIssues.map((issue) => issue.issueNumber);
      expect(issueNumbers).to.have.lengthOf(new Set(issueNumbers).size);
    });
  }); // method fetchProjectItems

  describe('fetchIssue', function () {
    this.slow(3000);
    this.timeout(5000);
    it('c1 - should fetch the issue details from GitHub and return the issue object', async () => {
      // Given the issue number
      const issueNumber = 7;

      // When fetching the issue details
      const issue = await uut.fetchIssue(issueNumber);

      // Then the issue should be fetched
      expect(issue).to.have.property('issueNumber', issueNumber);
      expect(issue).to.have.property('title');
      expect(issue).to.have.property('url');
      expect(issue).to.have.property('fields');
    });

    it('c2 - should get the issue details from loaded epic issue list', async () => {
      // Given epic issues are already loaded
      uut.epicIssues = epicIssues;
      const issueNumber = 7; // number doesn't matter, fake epic issue
      const issueFromList = uut.getIssue(issueNumber);

      // When fetching the issue details
      const issue = await uut.fetchIssue(issueNumber);

      // Then the issue should be fetched
      expect(issue).to.deep.equal(issueFromList);
    });
  }); // method fetchIssue
}); // GitHubClient
