import { GitHubGqlQuery } from './graphql-query.js';
import { GitHubIssue } from './issue.js';
import { CustomLogger } from '../custom-logger.js';

const logger = new CustomLogger(import.meta.url);

class GitHubClient {
  /** Client for interacting with a GitHub repository. */
  constructor(githubConfig) {
    /** Initializes the GitHub client with the given configuration. */
    this.githubConfig = githubConfig;
    this.query = new GitHubGqlQuery(githubConfig);
    this.epicIssues = [];
  }

  get config() {
    /** GitHub configuration. */
    return this.githubConfig;
  }

  async fetchProjectId() {
    /**
     * Fetch the project ID for the given project name.
     * If the project name is found, it will be set to configuration, otherwise an exception is raised.
     */
    const response = await this.query.project();

    const project = this.query.handleProjectResponse(response);
    this.githubConfig.projectId = project?.id;
  }

  async fetchProjectItems(pageSize = 50, _testPageLimit = undefined) {
    /** Fetch items from the GitHub project and their field values. */
    let endCursor = null;
    let hasNextPage = true;
    let totalItems = 0;

    logger.verbose(
      `Fetching issues for project: ${this.githubConfig.projectName} (${this.githubConfig.projectId})`
    );

    while (hasNextPage) {
      const response = await this.query.issues(endCursor, pageSize);
      const { nodes, pageInfo } = this.query.handleIssuesResponse(response);

      ({ hasNextPage, endCursor } = pageInfo);

      totalItems += this._handleIssuesData(nodes);

      if (_testPageLimit !== undefined && totalItems >= _testPageLimit * pageSize) break;
    }

    logger.verbose(`Found ${this.epicIssues.length} epic issues out of ${totalItems} items`);
    this.epicIssues.forEach((issue) => {
      logger.debug(`${issue.issueNumber} - ${issue.title}`);
    });
  }

  async fetchIssue(issueNumber) {
    /** Fetch the issue details from GitHub and return the issue object. */
    const issue = this.getIssue(issueNumber);
    if (issue) return issue;

    const response = await this.query.issue(issueNumber);
    const { item, fields } = this.query.handleIssueResponse(response);

    const newIssue = new GitHubIssue(item?.url);
    newIssue.loadFields(item, fields);
    return newIssue;
  }

  getIssue(issueNumber) {
    /** Get the issue details from loaded epic issue list. */
    return this.epicIssues.find((issue) => issue.issueNumber === issueNumber);
  }

  _handleIssuesData(items) {
    /**
     * Extract and process issue data from the provided items.
     * Look for issues marked as epics and append them to the `epicIssues` list.
     * @param items - A list of dictionaries containing issue data.
     * @returns The number of items processed.
     */

    const epicIssues = [];
    items.forEach((item) => {
      const content = item.content;
      if (!content) {
        return;
      }
      const issue = new GitHubIssue(content.url);
      issue.loadFields(content, item);

      if (issue.isEpic) {
        epicIssues.push(issue);
      }
    });

    this.epicIssues.push(...epicIssues);
    return items.length;
  }
}

export { GitHubClient };
