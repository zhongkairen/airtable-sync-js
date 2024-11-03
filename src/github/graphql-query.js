import GitHubGqlClient from './graphql-client.js';

export class GitHubGqlQuery {
  /** Class that constructs GraphQL queries for fetching data from a GitHub repository. */
  constructor(githubConfig) {
    this.githubConfig = githubConfig;
    this._ghGqlClient = new GitHubGqlClient(githubConfig.token);
  }

  async issue(issueNumber) {
    return this._ghGqlClient.query('getIssue', {
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

    const item = response.repository.issue;
    const nodes = item?.projectItems?.nodes;
    const fields = nodes ? nodes[0] : {};

    return { item, fields };
  }

  async issues(afterCursor, pageSize) {
    return this._ghGqlClient.query('getIssues', {
      projectId: this.githubConfig.projectId,
      afterCursor,
      pageSize,
    });
  }

  handleIssuesResponse(response) {
    /**
     * @param {Object} response - response json object
     * Expected response structure:
     * @see {files} ./graphql/getIssues.response.schema.json
     * @see {files} ./graphql/getIssues.response.json
     */
    // console.log('handleIssuesResponse response:', JSON.stringify(response, null, 2));
    if (response.errors) {
      throw new Error(`Error fetching items: ${JSON.stringify(response.errors)}`);
    }

    return response.node.items;
  }

  async project() {
    return this._ghGqlClient.query('getProject', { ...this.githubConfig });
  }

  handleProjectResponse(response) {
    /**
     * @param {Object} response - response json object
     * Expected response structure:
     * @see {files} ./graphql/getProject.response.schema.json
     * @see {files} ./graphql/getProject.response.json
     */
    if (response.errors) {
      throw new Error(`Error fetching project ID: ${JSON.stringify(response.errors)}`);
    }

    const nodes = response?.repository?.projectsV2?.nodes ?? [];
    const project = nodes.find((p) => p.title === this.githubConfig.projectName);

    if (!project) {
      throw new Error(
        `Project not found: ${this.githubConfig.projectName}`,
        '\nresponse:\n',
        JSON.stringify(response, null, 2)
      );
    }

    return project;
  }
}
