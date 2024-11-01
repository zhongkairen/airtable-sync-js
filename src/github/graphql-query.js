import { gql } from '@apollo/client';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ApolloClientWrapper from './graphql/apollo-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const url = 'https://api.github.com/graphql';

export class GraphQLQuery {
  /** Class that constructs GraphQL queries for fetching data from a GitHub repository. */
  constructor(githubConfig) {
    this.githubConfig = githubConfig;
    this.client = new ApolloClientWrapper(githubConfig.token, url).client;
  }

  _getQuery(queryName) {
    return gql(readFileSync(path.join(__dirname, `graphql/${queryName}.graphql`), 'utf8'));
  }

  async _query(queryName, variables) {
    const query = this._getQuery(queryName);
    const { data } = await this.client.query({ query, variables });
    return data;
  }

  async issue(issueNumber) {
    return this._query('getIssue', {
      owner: this.githubConfig.repoOwner,
      name: this.githubConfig.repoName,
      issueNumber,
    });
  }

  async issues(afterCursor, pageSize = 20) {
    return this._query('getIssues', {
      projectId: this.githubConfig.projectId,
      afterCursor,
      pageSize,
    });
  }

  async project() {
    return this._query('getProject', {
      owner: this.githubConfig.repoOwner,
      name: this.githubConfig.repoName,
    });
  }
}
