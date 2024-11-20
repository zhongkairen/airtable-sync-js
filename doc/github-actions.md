#### GitHub secrets
To run a workflow that automates the sync, add the tokens to GitHub repo settings as secrets.
Go to your repo, e.g. `mz-ad-request-team` Settings tab » Secrets and variables » Actions, in Repository secrets section click `New repository secret`. The names of the secret should be consistent with variable names in the workflow `airtable-sync.yml`.
```yaml
env:
    GITHUB_TOKEN: ${{ secrets.AIRSYNC_GITHUB_TOKEN }}
    AIRTABLE_TOKEN: ${{ secrets.AIRSYNC_AIRTABLE_TOKEN }}
```
e.g. for a GitHub token, create a secret with the name `AIRSYNC_GITHUB_TOKEN` in the `Name *` field, then paste the token into the `Secret *` field.
Repeat the same also for the Airtable token.