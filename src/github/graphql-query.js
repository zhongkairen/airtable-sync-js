import GitHubGqlClient from './graphql-client.js';

/** Class that constructs GraphQL queries for fetching data from a GitHub repository. */
export class GitHubGqlQuery {
  /**
   * Initializes the GitHub GraphQL query client with the given configuration.
   * @param {object} githubConfig - GitHub configuration object
   */
  constructor(githubConfig) {
    this.githubConfig = githubConfig;
    this._ghGqlClient = new GitHubGqlClient(githubConfig.token);
  }

  /**
   * Fetch the issue details from GitHub and return the issue object.
   * @param {integer} issueNumber
   * @returns object of {item, fields}, i.e. issue object, and its projectV2 fields
   */
  async getIssue(issueNumber) {
    const response = await this._getIssue(issueNumber);
    return this._handleIssueResponse(response);
  }

  /**
   * Make a request to GitHub to fetch the details of a single issue.
   * @param {integer} issueNumber
   * @returns promise to the response object
   */
  async _getIssue(issueNumber) {
    const { repoOwner, repoName } = this.githubConfig;
    return this._ghGqlClient.query('getIssue', {
      repoOwner,
      repoName,
      issueNumber,
    });
  }

  /**
   * Handle the response of `getIssue` request and return the issue object.
   * @param {object} response - response json object
   * Expected response structure:
   * @see {files} ./graphql/getIssue.response.schema.json
   * @see {files} ./graphql/getIssue.response.json
   * @returns object of {item, fields}, i.e. issue object, and its projectV2 fields
   */
  _handleIssueResponse(response) {
    if (response.errors) {
      logger.error(`Errors in response: ${JSON.stringify(response)}`);
      throw new Error(`Error fetching items: ${JSON.stringify(response.errors)}`);
    }

    const item = response.repository.issue;
    const nodes = item?.projectItems?.nodes;
    const fields = nodes ? nodes[0] : {};

    return { item, fields };
  }

  /**
   * Fetch the issues from GitHub and return the issue objects.
   * @param {string} afterCursor - cursor to fetch issues after
   * @param {integer} pageSize - number of issues to fetch
   * @returns array of issue objects
   */
  async getIssues(afterCursor, pageSize) {
    const response = await this._getIssues(afterCursor, pageSize);
    return this._handleIssuesResponse(response);
  }

  /**
   * Make a request to GitHub to fetch the details of multiple issues.
   * @param {*} afterCursor
   * @param {integer} pageSize
   * @returns promise to the response object
   */
  async _getIssues(afterCursor, pageSize) {
    return this._ghGqlClient.query('getIssues', {
      projectId: this.githubConfig.projectId,
      afterCursor,
      pageSize,
    });
  }

  /**
   * Handle the response of `getIssues` request and return the issue objects.
   * @param {object} response - response json object
   * Expected response structure:
   * @see {files} ./graphql/getIssues.response.schema.json
   * @see {files} ./graphql/getIssues.response.json
   */
  _handleIssuesResponse(response) {
    if (response.errors) {
      throw new Error(`Error fetching items: ${JSON.stringify(response.errors)}`);
    }

    return response.node.items;
  }

  /**
   * Fetch the project details from GitHub and return the project object.
   * @returns project object
   */
  async getProject() {
    const response = await this._getProject();
    return this._handleProjectResponse(response);
  }

  /**
   * Make a request to GitHub to fetch the details of the project.
   * @returns promise to the response object
   */
  async _getProject() {
    return this._ghGqlClient.query('getProject', { ...this.githubConfig });
  }

  _handleProjectResponse(response) {
    /**
     * @param {object} response - response json object
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
      console.log('no project found');
      throw new Error(
        `Project not found: ${this.githubConfig.projectName}`,
        '\nresponse:\n',
        JSON.stringify(response, null, 2)
      );
    }

    return project;
  }
}
