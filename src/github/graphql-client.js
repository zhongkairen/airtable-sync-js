import { GraphQLClient } from 'graphql-request'; // Use GraphQLClient from graphql-request
import { loadGql } from './graphql-loader.js';

class GitHubGqlClient {
  /**
   * Initializes the GitHub GraphQL client with the given token.
   * @param {string} token - The GitHub token to use for authentication.
   * @param {object} [mock] - The mock objects to use for testing.
   */
  constructor(token, mock) {
    if (process.env.NODE_ENV !== 'test' && mock != null)
      throw new Error('Mock object should only be used in test environment.');
    const { loadGql: loadGqlMock, gqlClient: gqlClientMock } = mock ?? {};
    const uri = 'https://api.github.com/graphql';
    this.#gqlClient =
      gqlClientMock ??
      new GraphQLClient(uri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    this.#queryCache = {};
    this.#loadGql = loadGqlMock ?? loadGql;
  }

  /** @type {GraphQLClient} */
  #gqlClient;

  /** @type {object} */
  #queryCache;

  /** @type {function} */
  #loadGql;

  /**
   * Make a GraphQL request to GitHub using the given query and variables.
   * @param {string} queryName - The name of the query to use.
   * @param {object} variables - The variables to pass to the query.
   * @returns {Promise<object>} - The response data from the GraphQL request.
   */
  async query(queryName, variables) {
    const gqlQuery = (this.#queryCache[queryName] ??= this.#loadGql(queryName));
    return await this.#gqlClient.request(gqlQuery, variables);
  }
}

export default GitHubGqlClient;
