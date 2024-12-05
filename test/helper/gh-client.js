import { ClientBase } from './client-base.js';
import axios from 'axios';
import fs from 'fs';
import { $path } from '../../src/path-util.js';

class GitHubClient extends ClientBase {
  constructor(config) {
    super(config);
  }

  /** @type {string} */
  #projectId;
  /** @type {object} */
  #fieldMapping;
  /** @type {Map<number, string>} */
  #projectItemMap;

  set cache(data) {
    this.#projectId = data.projectId;
    this.#fieldMapping = data.fieldIds;
    this.#projectItemMap = new Map(
      Object.entries(data.projectItemIds).map(([key, value]) => [Number(key), value])
    );
  }

  get cache() {
    return {
      projectId: this.#projectId,
      fieldIds: this.#fieldMapping ?? {},
      projectItemIds: this.#projectItemMap != null ? Object.fromEntries(this.#projectItemMap) : {},
    };
  }

  #loadQuery(queryFileName) {
    return fs.readFileSync($path`test/helper/${queryFileName}`, 'utf8');
  }

  async #postQuery(query, variables) {
    const githubAPI = 'https://api.github.com/graphql';
    const response = await axios.post(
      githubAPI,
      { query, variables },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  }

  async queryProjectId() {
    if (this.#projectId) return this.#projectId; // Return the project ID if already set

    // Query the project ID from GitHub
    const query = this.#loadQuery('get-project-id.graphql');
    const variables = { ...this.config };

    const response = await this.#postQuery(query, variables);
    const projectId = response.data.repository.projectsV2.nodes[0]?.id;
    if (!projectId) throw new Error(`Project with name "${this.config.projectName}" not found.`);

    return (this.#projectId = projectId);
  } // queryProjectId

  getProjectItem(issueNumber) {
    return this.#projectItemMap?.get(issueNumber);
  }

  async queryIssueAndProjectItem() {
    if (this.#projectItemMap != null) return;

    const query = this.#loadQuery('get-issue-and-project-item.graphql');
    const variables = { projectId: this.#projectId };
    const response = await this.#postQuery(query, variables);
    if (response.errors) {
      throw new Error('Failed to fetch data: ' + JSON.stringify(response.errors));
    }
    const nodes = response.data?.node?.items?.nodes ?? [];

    this.#projectItemMap = new Map();
    nodes.forEach((node) => {
      const issueNumber = node.content.number;
      const projectItemId = node.id;
      this.#projectItemMap.set(issueNumber, projectItemId);
    });
  } // queryIssueAndProjectItem

  async queryFieldIds() {
    if (this.#fieldMapping) return this.#fieldMapping;

    const query = this.#loadQuery('get-project-field-ids.graphql');
    const variables = { projectId: this.#projectId };

    const response = await this.#postQuery(query, variables);
    if (response.errors)
      throw new Error('Failed to fetch data: ' + JSON.stringify(response.errors[0].message));

    const fields = response.data?.node?.fields?.nodes ?? [];

    // Build a mapping of field names to field IDs
    const fieldMapping = fields.reduce((acc, field) => {
      acc[field.name] = field.id;
      return acc;
    }, {});

    return (this.#fieldMapping = fieldMapping);
  } // queryFieldIds

  /**
   * Update a Project V2 custom field for an issue.
   * @param {Array} updateFieldValues - An array of custom fields to update (fieldId, value pairs).
   * @returns {Promise<boolean>} - If all updates were successful.
   */
  async updateFieldsParallel(updateFieldValues) {
    const query = this.#loadQuery('update-project-item-fields.graphql');

    // Map updateFieldValues to promises
    const updatePromises = updateFieldValues.map(async (item) => {
      const { projectItemId, fieldValues, issueNumber } = item;

      // Map the fields to GitHub's expected format and create mutation promises
      const fieldUpdatePromises = fieldValues.map(async (field) => {
        const fieldId = this.#fieldMapping[field.github.field];
        const { value } = field.github;

        // Variables for the mutation
        const variables = {
          input: {
            projectId: this.#projectId,
            itemId: projectItemId,
            fieldId,
            value: { date: value }, // Adjust value format based on field type
            clientMutationId: 'abc123', // Add a unique identifier if needed
          },
        };

        // Execute the mutation
        const response = await this.#postQuery(query, variables);
        if (response.errors) {
          return { success: false, issueNumber, field, data: response };
        }
        // Check if the update was successful
        const success =
          projectItemId === response.data?.updateProjectV2ItemFieldValue?.projectV2Item?.id;
        return { success, issueNumber, field, data: response };
      });

      // Wait for all field updates for this item
      return Promise.all(fieldUpdatePromises);
    });

    // Wait for all updates for all items
    const results = await Promise.all(updatePromises);

    return results.flat(); //.every(Boolean);
  } // updateFieldsParallel

  async readIssues() {
    const query = this.#loadQuery('get-issues.graphql');
    const { projectId } = this.cache;
    const variables = { projectId, limit: 10 };
    const response = await this.#postQuery(query, variables);
    if (response.errors) {
      throw new Error('Failed to fetch data: ' + JSON.stringify(response.errors));
    }
    return response.data?.node?.items?.nodes ?? [];
  } // readIssues
} // GitHubClient

export { GitHubClient };
