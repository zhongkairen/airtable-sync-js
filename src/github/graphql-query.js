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

  handleIssueResponse(response) {
    if (response.errors) {
      logger.error(`Errors in response: ${JSON.stringify(response)}`);
      throw new Error(`Error fetching items: ${JSON.stringify(response.errors)}`);
    }

    const item = response.data.repository.issue;
    const nodes = item?.projectItems?.nodes;
    const fields = nodes ? nodes[0] : {};

    return { item, fields };
  }

  async issues(afterCursor, pageSize) {
    return this.client.query('getIssues', {
      projectId: this.githubConfig.projectId,
      afterCursor,
      pageSize,
    });
  }

  handleIssuesResponse(response) {
    if (response.errors) {
      throw new Error(`Error fetching items: ${JSON.stringify(response.errors)}`);
    }

    return response.data.node.items;
  }

  async project() {
    return this.client.query('getProject', {
      owner: this.githubConfig.repoOwner,
      name: this.githubConfig.repoName,
    });
  }

  handleProjectResponse(response) {
    if (response.errors) {
      throw new Error(`Error fetching project ID: ${JSON.stringify(response.errors)}`);
    }

    const projects = response.data.repository.projectsV2.nodes;
    const project = projects.find((p) => p.title === this.githubConfig.projectName);

    if (!project) {
      throw new Error(`Project not found: ${this.githubConfig.projectName}`);
    }

    return project;
  }
}
