
# airtable-sync-js
> A node module to sync GitHub issues to Airtable records.

## info

The module first checks the records in a table in an Airtable base, find the linked issues on GitHub and retries the fields that have changed, then it syncs the new values of the updated fields to Airtable.

Currently only a single GitHub repository is checked against the records in the Airtable base, even though sources from different repos can exist in that base, i.e. projects or initiatives from different teams.

## installation

Download the wheel file and install with pip:
```
npm login --registry=https://npm.pkg.github.com
npm install @zhongkairen/airtable-sync-js@latest
```
## usage
```
npx airtable-sync-js -i
```

## configure

- [Airtable authentication](doc/airtable-auth.md)
- [GitHub authentication](doc/github-auth.md)
- [config.json](doc/config-json.md)
- [GitHub action](doc/github-actions.md)


