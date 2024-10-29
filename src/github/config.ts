import { UserToken } from '../user-token';

interface ConfigJson {
    project?: string;
    owner?: string;
    repo?: string;
    fieldMap?: Record<string, any>; // Adjust the type as necessary
}

export class GitHubConfig {
    /** Class that handles the configuration for connecting to a GitHub repository. */

    /** Token string */
    token: string;
    /** Project name */
    projectName: string | undefined;
    /** Project ID */
    projectId: string | undefined; // Assuming this will be set somewhere
    /** Repository owner, e.g. 'octocat' as from github.com/octocat/Hello-World */
    repoOwner: string | undefined;
    /** Repository name, e.g. 'Hello-World' as from github.com/octocat/Hello-World */
    repoName: string | undefined;
    /** Mapping of Airtable field names to GitHub issue field names */
    fieldMap: Record<string, any>; // Adjust the type as necessary

    constructor(configJson: ConfigJson) {
        // Define the names of the environment variables and configuration keys for the token
        const nameDict = {
            token: 'GITHUB_TOKEN',
            tokenPath: 'GITHUB_TOKEN_PATH',
            configToken: 'token',
            configTokenPath: 'token_path',
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