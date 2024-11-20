
### GitHub authentication
Go to GitHub personal account settings » Developer settings » Personal access tokens » Fine-grained tokens, click `Generate new token` to create a fine-grained personal access token with the name `gh.read.repo.project.pat`,
**Resource owner**: `Unity-Technologies` \
**Repository access**: Check _Only select repositories_, then choose `Unity-Technologies/mz-<your>-team`

Use the following access scopes \
**Repository permissions**: `Issues` and `Metadata` as Read-only access. \
**Organization permissions**: `Projects` as Read-only access. \
❗Make sure you copy the token text immediately when prompted, the key won't re-appear after the prompt is dismissed.\
Create a pat file by pasting into the terminal:
```bash
echo "github_pat_<replace with your own token>" > ~/.ssh/gh.read.repo.project.pat
```
Set the proper file permission.
```bash
chmod 600 ~/.ssh/gh.read.repo.project.pat
```