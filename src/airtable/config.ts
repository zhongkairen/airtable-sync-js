import { UserToken } from './user_token';

interface ConfigJson {
    baseId?: string;
    tableId?: string;
    viewName?: string;
}

class AirtableConfig {
    /**
     * Class that handles the configuration for connecting to an Airtable base.
     */

    token: string;
    appId: string;
    tableId: string;
    viewName: string;

    constructor(configJson: ConfigJson) {
        /**
         * Initialize the AirtableConfig object.
         * @param configJson - Configuration values for Airtable.
         */

        // Define the names of the environment variables and configuration keys for the token
        const nameDict = {
            // Environment variable names for the token
            token: 'AIRTABLE_TOKEN',
            // Environment variable names for the token file path
            token_path: 'AIRTABLE_TOKEN_PATH',

            // Key name in the config.json for the token
            config_token: 'token',
            // Key name in the config.json for the token file path
            config_token_path: 'token_path',
        };

        // Load a token from environment variable or configuration, either directly or from a file.
        this.token = new UserToken(nameDict, configJson).read();

        // Load other configuration values from the configJson
        this.appId = configJson.baseId || '';
        this.tableId = configJson.tableId || '';
        this.viewName = configJson.viewName || '';
    }
}

export { AirtableConfig };