import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import inquirer from 'inquirer';

class ReleaseUtil {
  constructor() {}

  #currentBranch;
  #packageJsonVersion;
  #newVersion;

  async run() {
    this.readPackageJson();
    this.getCurrentGitBranch();

    if (!this.#currentBranch.match(/release\/v\d+\.\d+\.\d+/)) {
      // not a release branch
      await this.createReleaseBranch();
    } else if (this.#currentBranch === `release/v${this.#packageJsonVersion}`) {
      // version has been changed in package json, or the release branch was old
      // Check the version has been released, i.e. if the tag exists in main branch
      // check the date of tag
      console.log(
        `Current branch '${this.#currentBranch}' is already pointing to the version 'v${this.#packageJsonVersion}' in package.json`
      );
      // todo: add handling for this
      process.exit(0);
    }
    // release branch was created, but version was not bumped in package json
    // assert the branch version is newer than the package json version
    const branchVersion = this.#currentBranch.split('/').pop().replace(/^v/, '');
    console.assert(
      this.#compareVersion(branchVersion, this.#packageJsonVersion) > 0,
      `Branch version ${branchVersion} is not newer than the package.json version ${this.#packageJsonVersion}`
    );

    this.#newVersion = branchVersion;

    await this.checkChangelog();

    await this.bumpVersion();
  }

  /**
   * Compare two semantic versions.
   *
   * @param {string} version1 - The first version string (e.g., "1.2.3").
   * @param {string} version2 - The second version string (e.g., "1.2.4").
   * @returns {number} - Positive if version1 is newer, negative if version2 is newer, 0 if equal.
   */
  #compareVersion(version1, version2) {
    const parseVersion = (version) => version.split('.').map(Number);

    const [major1, minor1, patch1] = parseVersion(version1);
    const [major2, minor2, patch2] = parseVersion(version2);

    if (major1 !== major2) return major1 - major2;
    if (minor1 !== minor2) return minor1 - minor2;
    return patch1 - patch2;
  }

  readPackageJson() {
    const packageJsonPath = './package.json';
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    this.#packageJsonVersion = packageJson.version;
  }

  getCurrentGitBranch() {
    this.#currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  }

  async askUserSelection(message, choices) {
    const questions = [
      {
        type: 'list',
        name: 'selection',
        message,
        choices: [...choices, { name: 'Exit', value: 'exit' }],
      },
    ];

    const answers = await inquirer.prompt(questions);

    if (answers.selection === 'exit') process.exit(0);
    return answers.selection;
  }

  async createReleaseBranch() {
    console.log(
      `Current branch '${this.#currentBranch}' is not 'release/v${this.#packageJsonVersion}'`
    );

    const [ma, mi, pa] = this.#packageJsonVersion.split('.').map(Number);
    const majorBump = `${ma + 1}.0.0`;
    const minorBump = `${ma}.${mi + 1}.0`;
    const pathBump = `${ma}.${mi}.${pa + 1}`;
    const selectedVersion = await this.askUserSelection(
      `Do you want to create a new release branch? current version is v${this.#packageJsonVersion}`,
      [
        { name: `Patch (${pathBump})`, value: pathBump },
        { name: `Minor (${minorBump})`, value: minorBump },
        { name: `Major (${majorBump})`, value: majorBump },
      ]
    );

    console.log('>>>>>>>>>>> selectedVersion', JSON.stringify(selectedVersion, null, 2));

    const newBranch = `release/v${selectedVersion}`;
    execSync(`git checkout -b ${newBranch}`);
    this.#currentBranch = newBranch;

    this.#newVersion = selectedVersion;
  }

  async checkChangelog() {
    const lastCommitMessage = execSync('git log -1 --pretty=%B').toString().trim();
    const changelogCommitMessage = `Update changelog for v${this.#newVersion}`;
    if (lastCommitMessage === changelogCommitMessage) {
      return true;
    } else {
      console.log('Changelog is not updated');
      // Check if changelog file is dirty, and wait for user to update changelog
      const message = `Update the changelog file with the commit message "${changelogCommitMessage}"`;
      const question = [
        {
          type: 'list',
          name: 'selection',
          message,
          choices: ['Retry', 'Exit'],
        },
      ];

      const answers = await inquirer.prompt(question);
      if (answers.selection === 'Exit') {
        process.exit(0);
      }

      if (await this.checkChangelog()) return true;
    }
  }

  async bumpVersion() {
    const message = `Do you want to create a bump version commit and tag for v${this.#newVersion}?`;
    const question = [
      {
        type: 'confirm',
        name: 'proceed',
        message,
        default: false,
      },
    ];
    const answers = await inquirer.prompt(question);
    const command = `npm version v${this.#newVersion} -m \"Release v${this.#newVersion}\"`;
    if (answers.proceed) {
      execSync(command);
      execSync(`git tag | GREP_COLOR='1;33' grep -E --color=always '.*${this.#newVersion}.*|^'`);
    } else {
      console.log(`You can run later the command "${command}".`);
      process.exit(0);
    }
  }

  async pushBranchAndTag() {
    const message = `Do you want to push branch ${this.#currentBranch} and tag v${this.#newVersion} to origin?`;
    const question = [
      {
        type: 'confirm',
        name: 'proceed',
        message,
        default: false,
      },
    ];
    const answers = await inquirer.prompt(question);
    const command = `git push && git push origin v${this.#newVersion}`;
    if (answers.proceed) {
      execSync(command);
    } else {
      console.log(`You can run later the command "${command}".`);
      process.exit(0);
    }
  }
}

const releaseUtil = new ReleaseUtil();
await releaseUtil.run();
