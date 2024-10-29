import * as fs from 'fs';
import * as os from 'os';

interface Names {
    token?: string;
    token_path?: string;
    config_token?: string;
    config_token_path?: string;
}

class UserToken {
    /**
     * Token class to read a token from the environment or a file
     * If the token name ends with _PATH, the token is read from a file the path points to
     * Otherwise, the token is read directly from the environment variable
     */

    token?: string;
    tokenPath?: string;

    constructor(names: Names, fallback: Record<string, string>) {
        /**
         * Initialize the UserToken object.
         * @param names - The names of the environment variable and configuration keys for the token.
         * @param fallback - Fallback values for the token and token path.
         * @throws {Error} If neither the token path nor the token is set in the environment.
         */
        const token = names.token;
        const tokenPath = names.token_path;

        this.token = token ? process.env[token] : undefined;
        this.tokenPath = tokenPath ? process.env[tokenPath] : undefined;

        if (!this.tokenPath && !this.token) {
            const configToken = names.config_token;
            const configTokenPath = names.config_token_path;

            this.token = configToken ? fallback[configToken] : undefined;
            this.tokenPath = configTokenPath ? fallback[configTokenPath] : undefined;

            if (!this.tokenPath && !this.token) {
                throw new Error(
                    `${token} and ${tokenPath} not set in the environment; ${configToken} and ${configTokenPath} not set in the config.`
                );
            }
        }
    }

    read(): string {
        /**
         * Read the token from the environment or a file and return the token text.
         */
        if (this.token) {
            return this.token;
        }
        if (this.tokenPath) {
            return fs.readFileSync(os.homedir() + this.tokenPath, 'utf8').trim(); // Trim to remove leading/trailing whitespace
        }
        throw new Error('No valid token available.');
    }
}

export { UserToken };