import { GraphQLClient } from 'graphql-request'; // Use GraphQLClient from graphql-request
import gql from 'graphql-tag';
import { fileURLToPath } from 'url';
import { readFileSync as defaultReadFileSync } from 'fs';
import { getPath, PathName } from '../path-util.js';

const uri = 'https://api.github.com/graphql';

class GitHubGqlClient {
  constructor(token, readFileSync = defaultReadFileSync) {
    this._gqlClient = new GraphQLClient(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    this._readFileSync = readFileSync;
    this._queryCache = {};
  }

  _loadQuery(queryName) {
    const queryString = this._readFileSync(
      getPath(PathName.GRAPHQL, `${queryName}.graphql`),
      'utf8'
    );
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
    const data = await this._gqlClient.request(gqlQuery, variables); // Send request using graphql-request
    return data;
  }
}

export default GitHubGqlClient;
