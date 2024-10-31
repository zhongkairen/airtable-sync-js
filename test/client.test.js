// test/client.test.js
import { expect } from 'chai';
import { GitHubClient } from '../src/github/client.js'; // Adjust this path if needed
import { GitHubConfig } from '../src/github/config.js'; // If needed

describe('GitHubClient', () => {
    let githubConfig;
    let client;

    beforeEach(() => {
        githubConfig = new GitHubConfig({
            project: 'test-project',
            owner: 'test-owner',
            repo: 'test-repo',
            fieldMap: { 'test-field': 'test-value' },
        });
        client = new GitHubClient(githubConfig);
    });

    it('should initialize with the given configuration', () => {
        expect(client.config).to.equal(githubConfig);
    });

    it('should fetch project ID', async () => {
        await client.fetchProjectId();
        expect(client.config.projectId).to.exist; // Check if projectId exists
    });

    it('should throw an error if project ID is not found', async () => {
        githubConfig.projectName = 'non-existent-project';
        await expect(client.fetchProjectId()).to.be.rejectedWith('Failed to fetch project ID for project: non-existent-project');
    });
});