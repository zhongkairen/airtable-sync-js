import { ClientBase } from './client-base.js';
import axios from 'axios';
import fs from 'fs';
import { $path } from '../../src/path-util.js';

class GitHubClient extends ClientBase {
  constructor(config) {
    super(config);
    this.this.#projectId = this.config.projectId;
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
    const query = this.#loadQuery('get-project-field-ids.graphql');
    const variables = { projectId: this.#projectId };
    const response = await this.#postQuery(query, variables);
    console.debug('queryFieldIds response:', JSON.stringify(response.data, null, 2));
    if (response.data?.errors)
      throw new Error('Failed to fetch data: ' + JSON.stringify(response.data.errors[0].message));

    const fields = response.data.node.fields.nodes;

    // Build a mapping of field names to field IDs
    const fieldMapping = fields.reduce((acc, field) => {
      acc[field.name] = field.id;
      return acc;
    }, {});

    this.#fieldMapping = fieldMapping;

    return fieldMapping;
  } // queryFieldIds - todo: fix me

  /**
   * Update a Project V2 custom field for an issue.
   * @param {Array} updateFieldValues - An array of custom fields to update (fieldId, value pairs).
   * @returns {Promise<string>} - The ID of the updated project item.
   */
  async updateFieldsParallel(updateFieldValues) {
    const query = this.#loadQuery('update-project-item-fields.graphql');

    // Map updateFieldValues to promises
    const updatePromises = updateFieldValues.map(async (item) => {
      const { projectItemId, fieldValues } = item;

      // Map the fields to GitHub's expected format
      const fields = fieldValues.map((field) => {
        const fieldId = this.#fieldMapping[field.github.field];
        const { value } = field.airtable;
        return { fieldId, value };
      });

      // Variables for the mutation
      const variables = {
        projectId: this.#projectId, // Assuming this.#projectId is already set
        itemId: projectItemId,
        fields,
      };

      // Execute the mutation
      const response = await this.#postQuery(query, variables);
      const result = response.data;

      if (result.errors) {
        console.error(`Error updating project item ${projectItemId}:`, result.errors);
        throw new Error(`Failed to update fields for project item ${projectItemId}`);
      }

      console.log(`Updated fields for project item ${projectItemId}`);
      return result.data.updateProjectNextItemFieldValues.projectNextItem.id;
    });

    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);

    console.log('All fields updated successfully:', results);
    return results; // Return the IDs of updated project items
  } // updateFieldsParallel
} // GitHubClient

export { GitHubClient };
