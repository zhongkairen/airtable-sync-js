import gql from 'graphql-tag';
import { readFileSync } from 'fs';
import { getPath, PathName } from '../path-util.js';

class GqlLoader {
  /**
   * Load a GraphQL query from the file system.
   * @param {string} queryName - The name of the query file to load.
   */
  constructor(queryName, mock) {
    if (process.env.NODE_ENV !== 'test' && mock != null)
      throw new Error('Mock object should only be used in test environment.');
    const { getPath: getPathMock, readFileSync: readFileSyncMock } = mock ?? {};
    const getPathFunc = getPathMock ?? getPath;
    this.#queryPath = getPathFunc(PathName.GRAPHQL, `${queryName}.graphql`);
    this.#readFileSync = readFileSyncMock ?? readFileSync;
  }

  /** @type {graphql.DocumentNode} */
  #qgl;

  /** @type {string} */
  #queryPath;

  /** @type {function} */
  #readFileSync;

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
    const queryString = this.#readFileSync(this.#queryPath, 'utf8');
    return gql`
      ${queryString}
    `;
  }
}

const loadGql = (queryName) => new GqlLoader(queryName).qglQuery;

export { loadGql, GqlLoader };
