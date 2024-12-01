import { promises as fs } from 'fs';
import { UserToken } from './user-token.js';
import { PathUtil } from './path-util.js';

class ConfigBase {
  /**
   * Class that handles the configuration for connecting to an Airtable base.
   * @property {string} token - The token for the configuration.
   */

  /**
   * constructor
   * @param {Object} configJson - The configuration object.
   * @param {string} [configJson.token] - token text.
   * @param {string} [configJson.tokenPath] - path to the token file.
   * @param {string} prefix - Prefix to read token or token path from environment variables.
   */
  constructor(configJson, prefix, mock) {
    // Define the names of the environment variables and configuration keys for the token
    const nameDict = {
      // Environment variable names for the token
      tokenEnv: configJson.tokenEnv ?? `${prefix}_TOKEN`,
      // Environment variable names for the token file path
      tokenEnvPath: configJson.tokenEnvPath ?? `${prefix}_TOKEN_PATH`,

      // Key name in the config.json for the token
      configToken: 'token',
      // Key name in the config.json for the token file path
      configTokenPath: 'tokenPath',
    };

    if (process.env.NODE_ENV !== 'test' && mock !== undefined) {
      throw new Error('Mocking is only allowed in test environment.');
    }
    const UserTokenClass = (mock ?? {}).UserToken ?? UserToken;
    this.#userToken = new UserTokenClass(nameDict, configJson).read();

    Object.keys(configJson).forEach((key) => {
      if (key === 'token' || key === 'tokenPath') return;
      this[key] = configJson[key];
    });
  }

  /** @type {UserToken} */
  #userToken;

  /** @readonly @type {string} token - The token for the configuration. */
  get token() {
    return this.#userToken.value;
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
  constructor(configJson, mock) {
    super(configJson, 'AIRTABLE', mock);
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
  constructor(configJson, mock) {
    super(configJson, 'GITHUB', mock);
  }
}

class ConfigJson {
  constructor(fileName) {
    this.#fileName = fileName;
    this.#airtableConfig = null;
    this.#githubConfig = null;
  }

  #fileName;
  #json;
  #airtableConfig;
  #githubConfig;

  async load() {
    const data = await fs.readFile(this.#fileName, 'utf-8');
    this.#json = JSON.parse(data);
  }

  get airtableConfig() {
    return (this.#airtableConfig ??= new AirtableConfig(this.#json.airtable));
  }

  get githubConfig() {
    return (this.#githubConfig ??= new GitHubConfig(this.#json.github));
  }
}

export { AirtableConfig, GitHubConfig, ConfigJson };
