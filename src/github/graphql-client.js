import { GraphQLClient } from 'graphql-request'; // Use GraphQLClient from graphql-request
import gql from 'graphql-tag';
import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const graphqlDir = path.join(__dirname, 'graphql');
const uri = 'https://api.github.com/graphql';

class GitHubGqlClient {
  constructor(token) {
    this._client = new GraphQLClient(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    this._queryCache = {};
  }

  get client() {
    return this._client;
  }

  _loadQuery(queryName) {
    const queryString = readFileSync(path.join(graphqlDir, `${queryName}.graphql`), 'utf8');
    return gql`
      ${queryString}
    `;
  }

  _getQuery(queryName) {
    this._queryCache[queryName] ??= this._loadQuery(queryName);
    return this._queryCache[queryName];
  }

  async query(queryName, variables) {
    const gqlQuery = this._getQuery(queryName);
    const data = await this.client.request(gqlQuery, variables); // Send request using graphql-request
    return data;
  }
}

export default GitHubGqlClient;
