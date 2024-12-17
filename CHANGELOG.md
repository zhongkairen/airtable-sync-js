# [v1.1.0](https://github.com/zhongkairen/airtable-sync-js/compare/v1.1.0...v1.0.2) (2024-12-07)


### Features

* Add command option --config/-c
* Update field only if values are different

### Refactor

* Cleanup package for redundant deps and files

### Bug Fixes

* Sync issue for multiple fields
* Sync issue that no changes are detected
* Fix date parsing inconsistency in issue and record

### Chores

* Add end-to-end testing and workflow
* Fix issue in release workflow
* Fix integration test config.json and tokens
* Improve flakiness in integration tests
* Improve trigger for pages deployment workflow

## [v1.0.2](https://github.com/zhongkairen/airtable-sync-js/compare/v1.0.2...v1.0.1) (2024-11-27)


### Features

* Rename bin name to `airtalbe-sync-js`
* Rename package name to include the scope prefix

### Docs

* Add README
* Add docs in `doc` directory

### Chores

* Add publishing package to GitHub package registry
* Add a workflow to update run history of production sync
* Add a workflow to publish run chart HTML page
* Add a workflow to run integration tests on PR merge
* Change unit test workflow to run only in source changes
* Change release workflow to be triggered by the `new_release` event

## [v1.0.1](https://github.com/zhongkairen/airtable-sync-js/compare/v1.0.1...v1.0.0) (2024-11-19)


### Features

* Documentation on `config.json` file
* All MD files in `doc` folder in the package
* Example `config.json` in the package

### Refactor

* Replace placeholder `config.json` with `example.config.json`
* Package folder structure, source files under `src` dir

### Bug Fixes

* Binary name to be consistent with package name `airtable-sync-js`
* Minor info log text issue when synced with no changes

### Chores

* Fix release tagging
* Fix publishing release
* Remove tagging exception for certain debug branches

## [v1.0.0] (2024-11-18)


### Features

* Debug timer
* Integration tests
* GraphQL loaded from files

### Refactor

* Code structure
* Improve logging of issue and record

### Bug Fixes

* Log level
* Letter case in example config file

