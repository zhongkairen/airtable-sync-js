# Changelog

## [v1.1.0]
### Added
- Add command option --config/-c

### Changed
- Update field only if values are different
- Cleanup package for redundant deps and files

### Fixed
- Sync issue for multiple fields
- Sync issue that no changes are detected
- Fix date parsing inconsistency in issue and record

### CI/CD
- Add end-to-end testing and workflow
- Fix issue in release workflow
- Fix integration test config.json and tokens
- Improve flakiness in integration tests
- Improve trigger for pages deployment workflow

## [v1.0.2]
### Changed
- Rename bin name to `airtalbe-sync-js`
- Rename package name to include the scope prefix

### Documentation
- Add README
- Add docs in `doc` directory

### CI/CD
- Add publishing package to GitHub package registry
- Add a workflow to update run history of production sync
- Add a workflow to publish run chart HTML page
- Add a workflow to run integration tests on PR merge
- Change unit test workflow to run only in source changes
- Change release workflow to be triggered by the `new_release` event

## [v1.0.1]
### Added
- Documentation on `config.json` file
- All MD files in `doc` folder in the package
- Example `config.json` in the package

### Changed
- Replace placeholder `config.json` with `example.config.json`
- Package folder structure, source files under `src` dir
- Binary name to be consistent with package name `airtable-sync-js`

### Fixed
- Minor info log text issue when synced with no changes

### CI/CD
- Fix release tagging
- Fix publishing release
- Remove tagging exception for certain debug branches

## [v1.0.0]
### Added
- Debug timer
- Integration tests
- GraphQL loaded from files

### Changed
- Code structure
- Improve logging of issue and record

### Fixed
- Log level
- Letter case in example config file

## [v0.1.0-prerelease]
### Added
- Debug logger

### Changed
- Code refactoring

### Fixed
- Various features
