import GitHubGqlClient from './graphql-client.js';

export class GitHubGqlQuery {
  /** Class that constructs GraphQL queries for fetching data from a GitHub repository. */
  constructor(githubConfig) {
    this.githubConfig = githubConfig;
    this.client = new GitHubGqlClient(githubConfig.token).client;
  }

  async issue(issueNumber) {
    return this.client.query('getIssue', {
      owner: this.githubConfig.repoOwner,
      name: this.githubConfig.repoName,
      issueNumber,
    });
  }

  async issues(afterCursor, pageSize = 20) {
    return this.client.query('getIssues', {
      projectId: this.githubConfig.projectId,
      afterCursor,
      pageSize,
    });
  }

  async project() {
    return this.client.query('getProject', {
      owner: this.githubConfig.repoOwner,
      name: this.githubConfig.repoName,
    });
  }
}
