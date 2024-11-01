import { UserToken } from './user-token.js';

class ConfigBase {
    /**
     * Class that handles the configuration for connecting to an Airtable base.
     * @property {string} token - The token for the configuration.
     */

    /**
     * constructor
     * @param { Object } configJson - The configuration object.
     * @param {string} [configJson.token] - token text.
     * @param {string} [configJson.tokenPath] - path to the token file.
     * @param { string } prefix - Prefix to read token or token path from environment variables.
     */
    constructor(configJson, prefix) {
        // Define the names of the environment variables and configuration keys for the token
        const nameDict = {
            // Environment variable names for the token
            token: `${prefix}_TOKEN`,
            // Environment variable names for the token file path
            tokenPath: `${prefix}_TOKEN_PATH`,

            // Key name in the config.json for the token
            configToken: 'token',
            // Key name in the config.json for the token file path
            configTokenPath: 'tokenPath',
        };

        this._token = new UserToken(nameDict, configJson).read();

        Object.keys(configJson).forEach(key => {
            if (key === 'token' || key === 'tokenPath') return;
            this[key] = configJson[key];
        });
    }

    /** @property { string } token - The token for the configuration. */
    get token() {
        return this._token.value;
    }
}

class AirtableConfig extends ConfigBase {
    /**
     * Class that handles the configuration for connecting to an Airtable base.
     * constructor - @see ConfigBase constructor for other configuration values.
     * @param {Object} configJson - The configuration object.
     * @param {string} [configJson.baseId] - Airtable base ID.
     * @param {string} [configJson.tableName] - Airtable table name.
     * @param {string} [configJson.viewName] - Airtable view name.
     */
    constructor(configJson) {
        super(configJson, 'AIRTABLE');
    }
}

class GitHubConfig extends ConfigBase {
    /**
     * Class that handles the configuration for connecting to a GitHub repository.
     * constructor - @see ConfigBase constructor for other configuration values.
     * @param {string} [configJson.projectName] - Project name.
     * @param {string} [configJson.repoOwner] - Repository owner.
     * @param {string} [configJson.repoName] - Repository name.
     * @param {Object} [configJson.fieldMap] - Mapping of Airtable field names to GitHub issue field names.
     */
    constructor(configJson) {
        super(configJson, 'GITHUB');
    }
}



export { AirtableConfig, GitHubConfig };
