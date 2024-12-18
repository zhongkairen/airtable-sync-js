import * as fs from 'fs';
import * as os from 'os';
import { PathUtil } from './path-util.js';

class UserToken {
  /**
   * Token class to read a token from the environment or a file
   * If the token name ends with _PATH, the token is read from a file the path points to
   * Otherwise, the token is read directly from the environment variable
   */

  constructor(names, fallback) {
    /**
     * Initialize the UserToken object.
     * @param names - The names of the environment variable and configuration keys for the token.
     * @param fallback - Fallback values for the token and token path.
     * @throws {Error} If neither the token path nor the token is set in the environment.
     */
    const { tokenEnv, tokenEnvPath } = names;
    this.token = tokenEnv ? process.env[tokenEnv] : undefined;
    this.tokenPath = tokenEnvPath ? process.env[tokenEnvPath] : undefined;

    if (!this.tokenPath && !this.token) {
      const configToken = names.configToken;
      const configTokenPath = names.configTokenPath;

      this.token = configToken ? fallback[configToken] : undefined;
      this.tokenPath = configTokenPath ? fallback[configTokenPath] : undefined;

      if (!this.tokenPath && !this.token) {
        throw new Error(
          `${token} and ${tokenPath} not set in the environment; ${configToken} and ${configTokenPath} not set in the config.`
        );
      }
    }
  }

  /** @property { string } value - The token text. */
  get value() {
    return this.token;
  }

  read() {
    /**
     * Read the token from the environment or a file and return the token text.
     */
    if (!this.token && !this.tokenPath) throw new Error('No valid token available.');

    if (!this.token) {
      const tokenPath = PathUtil.expandHomeDir(this.tokenPath);
      this.token = fs.readFileSync(tokenPath, 'utf8').trim(); // Trim to remove leading/trailing whitespace
    }

    return this;
  }
}

export { UserToken };
