import { GitHubConfig } from './config';

export class GraphQLQuery {
    /** Class that constructs GraphQL queries for fetching data from a GitHub repository. */
    private githubConfig: GitHubConfig;

    constructor(githubConfig: GitHubConfig) {
        this.githubConfig = githubConfig;
    }

    issue(issueNumber: number): string {
        /**
         * GraphQL query to fetch a single issue with projectV2 fields from a GitHub repository.
         */
        return `
        query {
            repository(owner: "${this.githubConfig.repoOwner}", name: "${this.githubConfig.repoName}") {
                issue(number: ${issueNumber}) {
                    title
                    body
                    assignees(first: 10) {
                        nodes {
                            login
                        }
                    }
                    labels(first: 10) {
                        nodes {
                            name
                            color
                        }
                    }
                    projectItems(first: 1) {
                        nodes {
                            fieldValues(first: 10) {
                                nodes {
                                    ... on ProjectV2ItemFieldSingleSelectValue {
                                        name
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                    ... on ProjectV2ItemFieldTextValue {
                                        text
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                    ... on ProjectV2ItemFieldDateValue {
                                        date
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                    ... on ProjectV2ItemFieldNumberValue {
                                        number
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                    ... on ProjectV2ItemFieldIterationValue {
                                        duration
                                        startDate
                                        title
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        `;
    }

    issues(afterCursor: string, pageSize: number = 20): string {
        /**
         * GraphQL query to fetch issues with projectV2 fields from a GitHub project.
         * Pull requests and draft issues are not included in the query, but will be included in the query response.
         */
        return `
        query {
            node(id: "${this.githubConfig.projectId}") {
                ... on ProjectV2 {
                    items(first: ${pageSize}, after: "${afterCursor}") {
                        nodes {
                            id
                            fieldValues(first: 20) {
                                nodes {
                                    ... on ProjectV2ItemFieldTextValue {
                                        text
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                    ... on ProjectV2ItemFieldDateValue {
                                        date
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                    ... on ProjectV2ItemFieldSingleSelectValue {
                                        name
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                    ... on ProjectV2ItemFieldNumberValue {
                                        number
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                    ... on ProjectV2ItemFieldIterationValue {
                                        duration
                                        startDate
                                        title
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                }
                            }
                            content {
                                ... on Closable {
                                    closed
                                    closedAt
                                }
                                ... on Issue {
                                    title
                                    url
                                    state
                                    body
                                    assignees(first: 10) {
                                        nodes {
                                            login
                                        }
                                    }
                                    labels(first: 10) {
                                        nodes {
                                            name
                                            color
                                        }
                                    }
                                }
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            }
        }
        `;
    }

    project(): string {
        /** GraphQL query to fetch all projects from a GitHub repository. */
        return `
        query {
            repository(owner: "${this.githubConfig.repoOwner}", name: "${this.githubConfig.repoName}") {
                projectsV2(first: 100) {
                    nodes {
                        id
                        title
                    }
                }
            }
        }
        `;
    }

    headers(): { [key: string]: string } {
        /** Headers for the GraphQL query request. */
        return { "Authorization": `Bearer ${this.githubConfig.token}` };
    }
}