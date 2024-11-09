import { GitHubGqlQuery } from './graphql-query.js';
import { GitHubIssue } from './issue.js';
import { CustomLogger } from '../custom-logger.js';

const logger = new CustomLogger(import.meta.url);

class GitHubClient {
  /** Client for interacting with a GitHub repository. */

  /** Initializes the GitHub client with the given configuration. */
  constructor(githubConfig) {
    this.githubConfig = githubConfig;
    this.query = new GitHubGqlQuery(githubConfig);
    this.epicIssues = [];
  }

  /** @property config - GitHub configuration. */
  get config() {
    return this.githubConfig;
  }

  /**
   * Fetch the project ID for the given project name.
   * If the project name is found, it will be set to configuration, otherwise an exception is raised.
   * @returns {Promise<void>}
   */
  async fetchProjectId() {
    const project = await this.query.getProject();
    this.githubConfig.projectId = project?.id;
  }

  async fetchProjectItems(pageSize = 50, _testPageLimit = undefined) {
    /** Fetch items from the GitHub project and their field values. */
    logger.verbose(
      `Fetching issues for project: ${this.githubConfig.projectName} (${this.githubConfig.projectId})`
    );

    let totalItems = 0;
    for (let endCursor = null, hasNextPage = true; hasNextPage; ) {
      const { nodes, pageInfo } = await this.query.getIssues(endCursor, pageSize);
      ({ hasNextPage, endCursor } = pageInfo);
      totalItems += this._handleIssuesData(nodes);
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

  async fetchIssue(issueNumber) {
    /** Fetch the issue details from GitHub and return the issue object. */
    const issue = this.getIssue(issueNumber);
    if (issue) return issue;

    const { item, fields } = await this.query.getIssue(issueNumber);

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
