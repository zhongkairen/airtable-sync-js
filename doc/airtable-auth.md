### Airtable authentication
Go to `https://airtable.com/create/tokens`, and create a new personal access token with the name `airtable.records_wr.schema_base_r.github_sync_base.pat`, select the following access scopes:
```
data.records:read
data.records:write
schema.bases:read
```
Add base `GitHub Sync Base`, then click `Save changes` button.\
❗Make sure you copy the PAT immediately when prompted, the key won't re-appear after the prompt is dismissed.\
Create a pat file by pasting into the terminal:
```bash
echo "pat0K7pydcykHdApk.0fadd0a9<replace with your own token>" > ~/.ssh/airtable.records_wr.schema_base_r.github_sync_base.pat
```
Set the proper file permission.
```bash
chmod 600 ~/.ssh/airtable.records_wr.schema_base_r.github_sync_base.pat
```