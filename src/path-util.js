import path from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PathName = {
  HOME: 'home',
  ROOT: 'root',
  TEST: 'test',
  GRAPHQL: 'graphql',
};

/**
 * Expands a path that may contain `~` to the home directory.
 * @param {string} inputPath - The input path to expand.
 * @returns {string} - The expanded path.
 */
const expandHomeDir = (inputPath) => {
  if (typeof inputPath !== 'string') {
    throw new TypeError('Input must be a string');
  }
  return inputPath.replace(/^~(?=$|\/)/, homedir());
};

const getDirPath = (pathName) => {
  if (pathName === 'home') return homedir();
  if (pathName === 'root') return path.join(__dirname, '..');
  if (pathName === 'test') return path.join(__dirname, '../test');
  if (pathName === 'graphql') return path.join(__dirname, '../src/github/graphql');

  return '';
};

const getPath = (pathName, pathTrailer = '') => {
  const dirPath = getDirPath(pathName ?? PathName.ROOT);
  return path.join(dirPath, pathTrailer);
};

const PathUtil = {
  PathName,
  expandHomeDir,
  getDirPath,
  getPath,

  CONFIG_FILE_PATH: getPath(null, 'config.json'),
};

const __filename__ = (metaUrl) => fileURLToPath(metaUrl);

export { PathName, expandHomeDir, getDirPath, getPath, PathUtil, __filename__ };
