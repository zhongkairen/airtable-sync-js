import { GraphQLClient } from 'graphql-request'; // Use GraphQLClient from graphql-request
import { loadGql } from './graphql-loader.js';

class GitHubGqlClient {
  /**
   * Initializes the GitHub GraphQL client with the given token.
   * @param {string} token - The GitHub token to use for authentication.
   */
  constructor(token) {
    const uri = 'https://api.github.com/graphql';
    this.#gqlClient = new GraphQLClient(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    this.#queryCache = {};
  }

  /** @type {GraphQLClient} */
  #gqlClient;

  /** @type {object} */
  #queryCache;

  /**
   * Make a GraphQL request to GitHub using the given query and variables.
   * @param {string} queryName
   * @param {object} variables
   * @returns {Promise<object>} - The response data from the GraphQL request.
   */
  async query(queryName, variables) {
    const gqlQuery = this.#getQuery(queryName);
    return await this.#gqlClient.request(gqlQuery, variables); // Send request using graphql-request
  }

  /**
   * Get the query from the cache or load it from the file system
   * @param {string} queryName
   * @returns {graphql.DocumentNode}
   */
  #getQuery(queryName) {
    return (this.#queryCache[queryName] ??= loadGql(queryName));
  }
}

export default GitHubGqlClient;
