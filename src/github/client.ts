import { GraphQLClient } from 'graphql-request';

import { GitHubConfig } from './config.js';
import { GraphQLQuery } from './graphql-query.js';
import { GitHubIssue } from './issue.js';
import { CustomLogger } from '../custom-logger.js';

const logger = new CustomLogger(__filename);

export class GitHubClient {
    /** Client for interacting with a GitHub repository. */
    private githubConfig: GitHubConfig;
    private query: GraphQLQuery;
    private client: GraphQLClient;
    public epicIssues: GitHubIssue[];

    constructor(githubConfig: GitHubConfig) {
        /** Initializes the GitHub client with the given configuration. */
        this.githubConfig = githubConfig;
        this.query = new GraphQLQuery(githubConfig);
        this.client = new GraphQLClient('https://api.github.com/graphql');
        this.epicIssues = [];
    }

    get config(): GitHubConfig {
        /** GitHub configuration. */
        return this.githubConfig;
    }

    async fetchProjectId(): Promise<void> {
        /**
         * Fetch the project ID for the given project name.
         * If the project name is found, it will be set to configuration, otherwise an exception is raised.
         */
        const response: any = await this.client.request(this.query.project(), {
            headers: this.query.headers(),
        });

        if (response.errors) {
            throw new Error(`Error fetching project ID: ${JSON.stringify(response.errors)}`);
        }

        const projects: any = response.data.repository.projectsV2.nodes;
        const project = projects.find((p: any) => p.title === this.githubConfig.projectName);

        if (project) {
            this.githubConfig.projectId = project.id;
            return;
        }

        throw new Error(`Failed to fetch project ID for project: ${this.githubConfig.projectName}`);
    }

    async fetchProjectItems(): Promise<void> {
        /** Fetch items from the GitHub project and their field values. */
        let afterCursor: string | null = null;
        let hasNextPage = true;
        let totalItems = 0;
        const pageSize = 50;

        logger.verbose(`Fetching issues for project: ${this.githubConfig.projectName} (${this.githubConfig.projectId})`);

        while (hasNextPage) {
            const response: any = await this.client.request(this.query.issues(afterCursor, pageSize), {
                headers: this.query.headers(),
            });

            if (response.errors) {
                throw new Error(`Error fetching items: ${JSON.stringify(response.errors)}`);
            }

            const responseItems: any = response.data.node.items;
            totalItems += this._handleIssuesData(responseItems.nodes);

            hasNextPage = responseItems.pageInfo.hasNextPage;
            afterCursor = responseItems.pageInfo.endCursor;
        }

        logger.verbose(`Found ${this.epicIssues.length} epic issues out of ${totalItems} items`);
        this.epicIssues.forEach(issue => {
            logger.debug(`${issue.issueNumber} - ${issue.title}`);
        });
    }

    async fetchIssue(issueNumber: number): Promise<GitHubIssue> {
        /** Fetch the issue details from GitHub and return the issue object. */
        const issue = this.getIssue(issueNumber);
        if (issue) {
            return issue;
        }

        const query = this.query.issue(issueNumber);
        const response: any = await this.client.request(query, {
            headers: this.query.headers(),
        });

        if (response.errors) {
            logger.error(`Errors in response: ${JSON.stringify(response)}`);
            throw new Error(`Error fetching items: ${JSON.stringify(response.errors)}`);
        }

        const item = response.data.repository.issue;
        const fields = item.projectItems?.nodes;
        const firstIssueFields = fields ? fields[0] : {};
        const newIssue = new GitHubIssue(item.url);
        newIssue.loadFields(item, firstIssueFields);
        return newIssue;
    }

    getIssue(issueNumber: number): GitHubIssue | undefined {
        /** Get the issue details from loaded epic issue list. */
        return this.epicIssues.find(issue => issue.issueNumber === issueNumber);
    }

    private _handleIssuesData(items: any[]): number {
        /**
         * Extract and process issue data from the provided items.
         * Look for issues marked as epics and append them to the `epicIssues` list.
         * @param items - A list of dictionaries containing issue data.
         * @returns The number of items processed.
         */

        const epicIssues: GitHubIssue[] = [];
        items.forEach(item => {
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