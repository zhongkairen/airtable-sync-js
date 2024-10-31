import { UserToken } from '../user-token.js';

class GitHubConfig {
    /**
     * Class that handles the configuration for connecting to a GitHub repository.
     */

    /**
     * @param {Object} configJson - The configuration object.
     * @param {string} [configJson.project] - Project name.
     * @param {string} [configJson.owner] - Repository owner.
     * @param {string} [configJson.repo] - Repository name.
     * @param {Object} [configJson.fieldMap] - Mapping of Airtable field names to GitHub issue field names.
     */
    constructor(configJson) {
        // Define the names of the environment variables and configuration keys for the token
        const nameDict = {
            token: 'GITHUB_TOKEN',
            tokenPath: 'GITHUB_TOKEN_PATH',
            configToken: 'token',
            configTokenPath: 'tokenPath',
        };

        // Load a token from environment variable or configuration, either directly or from a file.
        this.token = new UserToken(nameDict, configJson).read();

        // Load other configuration values from the configJson
        this.projectName = configJson.project;
        this.repoOwner = configJson.owner;
        this.repoName = configJson.repo;
        this.fieldMap = configJson.fieldMap || {};
    }
}

export { GitHubConfig };
