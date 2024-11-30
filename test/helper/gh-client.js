import { ClientBase } from './client-base.js';
import axios from 'axios';
import fs from 'fs';
import { $path } from '../../src/path-util.js';

class GitHubClient extends ClientBase {
  constructor(config) {
    super(config);
    this.#projectId = this.config.projectId;
    this.#fieldMapping = {};
    this.issues = {};
  }

  #projectId;
  #fieldMapping;

  #loadQuery(queryFileName) {
    return fs.readFileSync($path`test/helper/${queryFileName}`, 'utf8');
  }

  async #postQuery(query, variables) {
    const githubAPI = 'https://api.github.com/graphql';
    return await axios.post(
      githubAPI,
      { query, variables },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  async queryProjectId() {
    if (this.#projectId) return this.#projectId; // Return the project ID if already set

    // Query the project ID from GitHub
    const query = this.#loadQuery('get-project-id.graphql');
    const variables = { ...this.config };

    const response = await this.#postQuery(query, variables);
    const projectId = response.data.data.repository.projectsV2.nodes[0]?.id;
    if (!projectId) throw new Error(`Project with name "${this.config.projectName}" not found.`);

    this.#projectId = projectId;
    return projectId;
  } // queryProjectId

  async queryIssueAndProjectItem(issueNumber) {
    const query = this.#loadQuery('get-issue-and-project-item.graphql');
    const projectId = this.#projectId;
    const { repoOwner, repoName } = this.config;
    const variables = {
      repoOwner,
      repoName,
      issueNumber,
      projectId,
    };

    const response = await this.#postQuery(query, variables);
    const { data } = response;
    if (data.errors) {
      throw new Error('Failed to fetch data: ' + JSON.stringify(data.errors));
    }

    const issueId = data.data.repository.issue.id;
    const projectItem = data.data.node.items.nodes.find((item) => item.content.id === issueId);
    const projectItemId = projectItem?.id;
    this.issues[issueNumber] = { issueId, projectItemId };
    // console.debug('issue Number', issueNumber, 'issueId:', issueId, 'projectItem:', projectItem);

    if (!projectItem) {
      throw new Error('No matching project item found.');
    }

    return { issueId, projectItemId: projectItem.id };
  } // queryIssueAndProjectItem

  async queryFieldIds() {
    if (this.config.fieldIds) return (this.#fieldMapping = this.config.fieldIds);

    const query = this.#loadQuery('get-project-field-ids.graphql');
    const variables = { projectId: this.#projectId };

    // console.debug('queryFieldIds variables:', JSON.stringify(variables, null, 2));

    const response = await this.#postQuery(query, variables);
    // console.debug('queryFieldIds response:', JSON.stringify(response.data, null, 2));
    if (response.data?.errors)
      throw new Error('Failed to fetch data: ' + JSON.stringify(response.data.errors[0].message));

    const fields = response.data.node.fields.nodes;

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
        if (response.error || response.data?.errors) {
          return { success: false, issueNumber, field, data: response.data };
        }
        const result = response.data;
        // Check if the update was successful
        const success =
          projectItemId === result.data?.updateProjectV2ItemFieldValue?.projectV2Item?.id;
        return { success, issueNumber, field, data: result.data };
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
    const variables = { ...this.config, limit: 10 };
    const response = await this.#postQuery(query, variables);
    return response.data.data.node.items.nodes;
  } // readIssues
} // GitHubClient

export { GitHubClient };
