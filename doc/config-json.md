
## config.json
To use the module, a `config.json` file must be placed in either the current working directory or the package installation directory.

**Example configuration file**\
An example `example.config.json` file is provided in the root directory of the source package.

1. **Copy** the example file to your chosen location.
2. **Rename** the file to `config.json`.
3. **Edit** the file as needed to fit your setup.


### Set up tokens
Create environment variables
```bash
export GITHUB_TOKEN_PATH=/path/to/your/airtable.records_wr.schema_base_r.github_sync_base.pat
export AIRTABLE_TOKEN_PATH=/path/to/your/gh.read.repo.project.user.pat
```
Replace with proper file names if you in the earlier step with different names.

Alternatively put tokens directly in the file, not recommended as it's less secure.\
❗`Example`❗
```bash
export GITHUB_TOKEN=ghp_2n45dH8TJ3QrZ9b1hYV0Ck6Fp8AeGz5wXm
export AIRTABLE_TOKEN=pat4KwZLQ5yFmsJDa.22cd1ec678943216ae4b874f1d8814223c71a56d9d58371c0b1f8b3ef9e4a2f
```

If nothing has been exported to env, similar configuration can be done in `config.json`.
```json
  "github": {
    "token_path": "/path/to/your/gh.read.repo.project.user.pat",
  }
```
or directly using the token
```json
"airtable": {
  "token": "pat4KwZLQ5yFmsJDa.22cd1ec678943216ae4b874f1d8814223c71a56d9d58371c0b1f8b3ef9e4a2f",
}
```



### Configure GitHub and Airtable parameters
Change `config.json`, the base ID and table ID as needed, e.g. if your Airtable base has a URL `https://airtable.com/apptII3QtVU8j387f/tblWNyuu51KBQevsR/viw5GukP9N2HNuL2A?blocks=hide`, the base ID is the part that starts with `app` and table ID is the part that starts with `tbl`.
```json
{
    "airtable": {
        "baseId": "apptII3QtVU8j387f",
        "tableId": "tblWNyuu51KBQevsR"
    },
    ...
}
```

Change the repo name and project name as needed, e.g. if your GitHub repo base has a URL `https://github.com/Unity-Technologies/mz-ds-deep-learning`, the repo name is the last part, while as the project name is one of those that can be found in the `Projects` tab of your repo.
```json
{
    ...
    "github": {
        "owner": "Unity-Technologies",
        "repo": "mz-ds-deep-learning",
        "project": "ML Engineering"
    }
}
```
