import gql from 'graphql-tag';
import { readFileSync } from 'fs';
import { getPath, PathName } from '../path-util.js';

class GqlLoader {
  /**
   * Load a GraphQL query from the file system.
   * @param {string} queryName - The name of the query file to load.
   */
  constructor(queryName) {
    this.#queryPath = getPath(PathName.GRAPHQL, `${queryName}.graphql`);
  }

  /** @type {graphql.DocumentNode} */
  #qgl;

  /** @type {string} */
  #queryPath;

  /**
   * @readonly
   * @returns {graphql.DocumentNode}
   */
  get qglQuery() {
    return (this.#qgl ??= this.#loadQuery());
  }

  /**
   * Read the query from the file system and return the parsed query.
   * @returns {graphql.DocumentNode}
   */
  #loadQuery() {
    const queryString = readFileSync(this.#queryPath, 'utf8');
    return gql`
      ${queryString}
    `;
  }
}

const loadGql = (queryName) => new GqlLoader(queryName).qglQuery;

export { loadGql, GqlLoader };
