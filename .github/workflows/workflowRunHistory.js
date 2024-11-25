/**
 * npm install axios unzipper yargs cli-progress
 * node workflowRunHistory.js --owner=myusername --repo=myrepo --id=123456
 * --id: GitHub workflow ID, e.g. 129168253
 *       How to get the workflow ID:
 *         curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
 *         https://api.github.com/repos/WNER/REPO/actions/workflows
 * --owner: GitHub repository owner, ${{ github.repository_owner }}
 * --repo: GitHub repository name, ${{ github.event.repository.name }}
 *
 * Pre-requisites:
 * `GITHUB_AIRTABLE_SYNC_READONLY_ACTION_TOKEN` - Token that has read access to the workflow runs
 * `GITHUB_AIRTABLE_SYNC_GIST_TOKEN` - Token that has access to the Gist API
 */
import axios from 'axios';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import unzipper from 'unzipper';
import ProgressBar from 'cli-progress';

class WorkflowRunHistory {
  constructor({ actionTokenName, gistTokenName, repo, owner, workflowId }) {
    this.actionToken = process.env[actionTokenName];
    this.gistToken = process.env[gistTokenName];

    if (!this.actionToken || !this.gistToken) {
      throw new Error(`Token not set from '${actionTokenName}', '${gistTokenName}'`);
    }
    this.repo = repo;
    this.owner = owner;
    this.workflowId = workflowId;
  }

  #csvFile;

  get history() {
    return this.#csvFile.history;
  }

  async fetchWorkflowRuns() {
    await this.#fetchExistingHistory();
    const historyEntries = await this.#fetchNewWorkflowRuns();
    this.#csvFile.addToHistory(historyEntries);
    await this.#csvFile.write();
  }

  async fetchWorkflows() {
    const url = '/actions/workflows';
    const response = await this.#doRequest(url);
    if (response.status !== 200) {
      console.log(`Failed to fetch workflows: ${response.status} ${response.statusText}`);
      return [];
    }
    return response.data?.workflows ?? [];
  }

  async #fetchExistingHistory() {
    console.log('Fetching existing history...');
    const id = 'fc2f1cc930249c70644310e7255cc549';
    const fileName = 'airtable-sync-js.run-history.csv';
    const gist = { id, fileName, token: this.gistToken, owner: this.owner };
    this.#csvFile ??= new CsvFile(gist);
    await this.#csvFile.read();
  }

  async #fetchNewWorkflowRuns() {
    // Filter out runs already in history
    const runsNotInHistory = await this.#fetchNewRuns();

    const progressBar = new ProgressBar.Bar(
      {
        format: 'Processing |{bar}| {percentage}% | {value}/{total} Runs',
        clearOnComplete: true,
      },
      ProgressBar.Presets.shades_classic
    );
    progressBar.start(runsNotInHistory.length, 0);

    const historyEntries = await this.#fetchWorkflowRunsData(runsNotInHistory, progressBar);

    progressBar.stop();
    return historyEntries;
  }

  async #fetchNewRuns() {
    const url = `/actions/workflows/${this.workflowId}/runs`;
    const response = await this.#doRequest(url);

    if (response.status !== 200) {
      console.log(`Failed to fetch workflow runs: ${response.status} ${response.statusText}`);
      return [];
    }

    const workflow_runs = response.data.workflow_runs || [];
    // Filter out runs already in history
    const runsNotInHistory = workflow_runs.filter(
      (run) => !this.#csvFile.isInHistory(run.run_number)
    );
    if (runsNotInHistory.length === 0) {
      console.log(
        `No new runs to process, first run number: ${this.#csvFile.history[0].runNumber}`
      );
    }

    return runsNotInHistory;
  }

  async #fetchWorkflowRunsData(runs, progressBar) {
    const tasks = runs
      .filter(({ status }) => status === 'completed')
      .map(({ id: runId }) => this.#fetchRunStatus(runId, progressBar));

    const statusDataset = await Promise.all(tasks);

    return statusDataset
      .sort((a, b) => b.json.runNumber - a.json.runNumber)
      .map(({ json: { startedAt, runNumber, event, version, duration = 0, syncSucceeded } }) => {
        return new HistoryItem({
          startedAt,
          runNumber,
          event,
          conclusion: syncSucceeded,
          duration,
          version,
        });
      });
  }

  async #doRequest(url, stream = false) {
    if (!this.actionToken) {
      throw new Error('Token not set');
    }

    const headers = {
      Authorization: `token ${this.actionToken}`,
      Accept: 'application/vnd.github.v3+json',
    };

    const baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
    const fullUrl = `${baseUrl}${url}`;

    try {
      const response = await axios.get(fullUrl, {
        headers,
        responseType: stream ? 'stream' : 'json',
      });
      return response;
    } catch (error) {
      console.error(
        `Failed to make request: ${error.response?.status} ${error.response?.statusText}`
      );
      throw error;
    }
  }

  async #fetchRunStatus(runId, progressBar) {
    const json = await this.#getRunStatusInLogs(runId);
    progressBar.increment();
    return { runId, json };
  }

  async #getRunStatusInLogs(runId) {
    const url = `/actions/runs/${runId}/logs`;
    const response = await this.#doRequest(url, true);

    if (response.status === 200) {
      const zipStream = response.data;
      const jsonData = await this.#extractJsonData(zipStream, runId);
      return jsonData;
    }
  }

  async #extractJsonData(zipStream, runId) {
    const jobLogFilename = /^run-prd-sync\/.*Update status\.txt/m;
    const jsonPattern = /sync-status:\s*(\{[^}]*\})\n/;

    return new Promise((resolve, reject) => {
      const unzipStream = zipStream.pipe(unzipper.Parse());
      unzipStream
        .on('entry', (entry) => {
          if (entry.path.match(jobLogFilename)) {
            let data = '';
            // Accumulate data from the entry stream
            entry
              .on('data', (chunk) => {
                data += chunk;
              })
              .on('end', () => {
                const match = data.match(jsonPattern);
                if (match) {
                  try {
                    const result = JSON.parse(match[1]);
                    resolve(result);
                  } catch (error) {
                    console.error(`JSON parsing failed for ${entry.path}: ${match[1]}`, error);
                    resolve({});
                  }
                }
              });
          } else {
            entry.autodrain(); // Drain non-matching entries
          }
        })
        .on('close', () => {
          resolve({}); // Resolve after processing all entries
        })
        .on('error', (error) => {
          console.error('Unzip stream error:', error);
          reject(error); // Reject the promise if there’s an error
        });
    });
  }
}

class HistoryItem {
  constructor(arg) {
    if (typeof arg === 'string') {
      const [startedAt, runNumber, event, conclusion, duration, version] = arg.split(',');
      this.startedAt = startedAt.trim();
      this.runNumber = parseInt(runNumber.trim());
      this.event = event.trim();
      this.conclusion = conclusion.trim();
      this.duration = duration.trim();
      this.version = version.trim();
    } else {
      // Copy run data
      Object.assign(this, arg);
    }
  }

  toString() {
    return `${this.startedAt},${this.runNumber},${this.event},${this.conclusion},${this.duration},${this.version}`;
  }
}

class CsvFile {
  constructor(gist) {
    this.gist = gist;
    this.#history = [];
    this.#updated = false;
  }

  /** @type {array} */
  #history;

  /** @type {boolean} */
  #updated;

  toString() {
    return self.history.map((item) => item.toString()).join('\n');
  }

  get history() {
    return this.#history;
  }

  async read() {
    const { owner, id, fileName, token } = this.gist;
    const url = `https://gist.githubusercontent.com/${owner}/${id}/raw/${fileName}`;
    try {
      const response = await axios.get(url, { headers: { Authorization: `token ${token}` } });
      this.#history = response.data
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => new HistoryItem(line.trim()));
      this.#updated = false;
    } catch (error) {
      console.error(`Failed to fetch existing history: ${error.message}`);
      throw error;
    }
  }

  isInHistory(runNumber) {
    return this.#history.some((item) => item.runNumber === runNumber);
  }

  addToHistory(items) {
    if (items.length === 0) return;
    this.#updated = items.length > 0;
    this.#history.push(...items);
    this.#history.sort((a, b) => b.runNumber - a.runNumber);
  }

  async write() {
    if (!this.#updated) return false;

    const url = `https://api.github.com/gists/${this.gist.id}`;
    const payload = {
      files: {
        [this.gist.fileName]: {
          content: this.#history.join('\n'),
        },
      },
    };

    try {
      const response = await axios.patch(url, payload, {
        headers: {
          Authorization: `token ${this.gist.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (response.status === 200) {
        console.log(`Successfully updated Gist: ${this.gist.fileName}`);
        this.#updated = false;
        return true;
      } else {
        console.log(`Failed to update Gist: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to update Gist: ${error.message}`);
    }
  }
}

/**
 * Parse command line arguments for GitHub workflow history fetching.
 * @returns {Object} - Parsed arguments: owner, repo, id.
 */
function parseArguments() {
  return yargs(hideBin(process.argv))
    .usage('Usage: $0 --owner <owner> --repo <repo> [--id <workflow ID>]')
    .option('owner', {
      alias: 'o',
      demandOption: true,
      describe: 'GitHub repository owner',
    })
    .option('repo', {
      alias: 'r',
      demandOption: true,
      describe: 'GitHub repository name',
    })
    .option('id', {
      alias: 'i',
      demandOption: false,
      describe: 'GitHub workflow ID',
    })
    .version(false)
    .help(false)
    .alias('help', 'h')
    .parse();
}

const main = async () => {
  const argv = parseArguments();
  const { owner, repo, id: workflowId } = argv;

  const actionTokenName = 'GITHUB_AIRTABLE_SYNC_READONLY_ACTION_TOKEN';
  const gistTokenName = 'GITHUB_AIRTABLE_SYNC_GIST_TOKEN';
  const workflowRunHistory = new WorkflowRunHistory({
    actionTokenName,
    gistTokenName,
    repo,
    owner,
    workflowId,
  });

  if (workflowId) {
    await workflowRunHistory.fetchWorkflowRuns();
  } else {
    const workflows = await workflowRunHistory.fetchWorkflows();
    const lines = workflows.map(({ id, name, path }) => `${id}: ${path} - ${name}`);
    console.log(lines.join('\n'));
  }
};

main()
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0); // Ensure the process exits after all async work
  });
