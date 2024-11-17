import { GitHubGqlQuery } from './graphql-query.js';
import { GitHubIssue } from './issue.js';
import { CustomLogger } from '../custom-logger.js';
import { GitHubConfig } from '../config.js';

const logger = new CustomLogger(import.meta.url);

/** Client for interacting with a GitHub repository. */
class GitHubClient {
  /** Initializes the GitHub client with the given configuration. */
  constructor(githubConfig) {
    this.#githubConfig = githubConfig;
    this.#query = new GitHubGqlQuery(githubConfig);
    this.epicIssues = [];
  }

  /** @type {GitHubConfig} */
  #githubConfig;

  /** @type {GitHubGqlQuery} */
  #query;

  /**
   * Only for testing purposes.
   * @type {GitHubIssue[]} */
  set mockQuery(query) {
    this.#query = query;
  }

  /**
   * @readonly
   * @type {object} - GitHub configuration.
   * @deprecated is this used?
   */
  get config() {
    return this.#githubConfig;
  }

  /**
   * Fetch the project ID for the given project name.
   * If the project name is found, it will be set to configuration, otherwise an exception is raised.
   * @returns {Promise<void>}
   */
  async fetchProjectId() {
    const project = await this.#query.getProject();
    this.#githubConfig.projectId = project?.id;
  }

  /**
   * Fetch the epic issues from the GitHub project.
   * @param {number} pageSize - The integer number of items to fetch per page.
   * @param {number} _testPageLimit - The integer number of max pages to fetch for testing purposes.
   */
  async fetchProjectItems(pageSize = 50, _testPageLimit = undefined) {
    /** Fetch items from the GitHub project and their field values. */
    logger.verbose(
      `Fetching issues for project: ${this.#githubConfig.projectName} (${this.#githubConfig.projectId})`
    );

    let totalItems = 0;
    for (let endCursor = null, hasNextPage = true; hasNextPage; ) {
      const { nodes, pageInfo } = await this.#query.getIssues(endCursor, pageSize);
      ({ hasNextPage, endCursor } = pageInfo);
      totalItems += this.#handleIssuesData(nodes);
      if (_testPageLimit !== undefined && totalItems >= _testPageLimit * pageSize) break;
    }

    // Log the epic issues found
    logger.verbose(`Found ${this.epicIssues.length} epic issues out of ${totalItems} items`);
    logger.debug(
      'this.epicIssues:\n' +
        this.epicIssues
          .sort((a, b) => a.issueNumber - b.issueNumber)
          .map((issue) => `${String(issue.issueNumber).padStart(5, ' ')} - ${issue.title}`)
          .join('\n')
    );
  }

  /**
   * Fetch the issue details from GitHub.
   * If the issue is already loaded, it will be returned without fetching.
   * @param {number} issueNumber - The integer number of the issue to retrieve.
   * @returns {Promise<GitHubIssue>} - The issue object.
   */
  async fetchIssue(issueNumber) {
    /** Fetch the issue details from GitHub and return the issue object. */
    const issue = this.getIssue(issueNumber);
    if (issue) return issue;

    const { item, fields } = await this.#query.getIssue(issueNumber);

    const newIssue = new GitHubIssue(item?.url);
    newIssue.loadFields(item, fields);
    return newIssue;
  }

  /**
   * Get the issue details from loaded epic issue list.
   * @param {number} issueNumber - The integer number of the issue to retrieve.
   * @returns {GitHubIssue} - The issue object，or `undefined` if not found.
   */
  getIssue(issueNumber) {
    return this.epicIssues.find((issue) => issue.issueNumber === issueNumber);
  }

  /**
   * Extract and process issue data from the provided items.
   * Look for issues marked as epics and append them to the `epicIssues` list.
   * If data is missing or not an epic, it will not be added to the `epicIssues` list.
   * @param {Array<object>} items - A list of dictionaries containing issue data.
   * @returns {number} The number of `items` processed.
   */
  #handleIssuesData(items) {
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
