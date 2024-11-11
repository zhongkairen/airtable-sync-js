import path from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import * as fsN from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const home = homedir();
const packageRoot = path.join(__dirname, '..');
const test = path.join(packageRoot, 'test');
const graphql = path.join(packageRoot, 'src/github/graphql');
const cwd = process.cwd();

class PathUtil {
  static get dir() {
    return {
      home,
      packageRoot,
      test,
      graphql,
      cwd,
    };
  }

  static get file() {
    return {
      configJson: (() => {
        const { cwd, packageRoot } = PathUtil.dir;
        const configFile = 'config.json';
        const configPath = PathUtil.findFirstExistingFile([cwd, packageRoot], configFile);
        if (!configPath) throw new Error(`${configFile} not found in ${cwd} and ${packageRoot}.`);
        return configPath;
      })(),
    };
  }

  static path(strings, ...values) {
    const basePathWithKey = strings[0].trim();
    const pathKey = basePathWithKey.split('/')[0];
    const baseDir = PathUtil.dir[pathKey];
    if (!baseDir) throw new Error(`Unknown base path: ${pathKey}`);

    // Reconstruct remaining path by combining strings and values
    const combinedPath = [basePathWithKey.slice(pathKey.length), ...strings.slice(1)]
      .map((str, index) => str + (values[index] || ''))
      .join('');

    // Return the complete path
    return path.join(baseDir, combinedPath);
  }

  /**
   * Expands a path that may contain `~` to the home directory.
   * @param {string} inputPath - The input path to expand.
   * @returns {string} - The expanded path.
   */
  static expandHomeDir(inputPath) {
    if (typeof inputPath !== 'string') {
      throw new TypeError('Input must be a string');
    }
    return inputPath.replace(/^~(?=$|\/)/, homedir());
  }

  /**
   * Find the first existing file in a list of directories.
   * @param {Array<string>} directories
   * @param {string} filename
   * @param {fs} fs - File system module for testing mocks
   * @returns {string} full path to the first existing file or undefined if none found
   */
  static findFirstExistingFile(directories, filename, fs = fsN) {
    for (const dir of directories) {
      const fullPath = path.join(dir, filename);
      if (fs.existsSync(fullPath)) return fullPath;
    }
  }
}

const $path = PathUtil.path;

export { PathUtil, $path };
