---
name: GitHub sync workflow
description: How to push code from Replit to dugxex27-dotcom/homebase on GitHub, including token quirks
---

# GitHub Sync Workflow

## The sync scripts are gone
`scripts/sync-to-github.py` and `scripts/pull-from-github.py` no longer exist in the repo.

## Pushing to GitHub

Use the GitHub Contents API directly (REST). The agent's bash environment gets a **stale copy** of `GITHUB_TOKEN` — it will return 401 even if the secret is valid. Always test the token from the **Replit Shell** tab, not from bash tool.

**To confirm token is live:**
```bash
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
# Should print 200
```

**To push a single file to GitHub from the Shell:**
```python
python3 -c "
import os,urllib.request,json,base64
T=os.environ['GITHUB_TOKEN'];R='dugxex27-dotcom/homebase'
h={'Authorization':f'token {T}','Accept':'application/vnd.github+json','User-Agent':'hb','Content-Type':'application/json'}
def get(p):
    with urllib.request.urlopen(urllib.request.Request(f'https://api.github.com/{p}',headers=h)) as r:return json.loads(r.read())
def put(p,d):
    req=urllib.request.Request(f'https://api.github.com/{p}',json.dumps(d).encode(),h,method='PUT')
    with urllib.request.urlopen(req) as r:return json.loads(r.read())
fi=get(f'repos/{R}/contents/PATH_TO_FILE?ref=main')
content=open('PATH_TO_FILE','rb').read()
res=put(f'repos/{R}/contents/PATH_TO_FILE',{'message':'commit message','content':base64.b64encode(content).decode(),'sha':fi['sha'],'branch':'main'})
print('Done!' if 'content' in res else f'Error: {res}')
"
```

## Git remote situation
There is no `origin` remote pointing directly to GitHub HTTPS. The Replit Git panel uses Replit's internal SSH infrastructure (`subrepl-*` remotes). `git push` from the Shell goes to Replit's system; the GitHub integration button in the Git panel is what syncs to GitHub.

**Why:** The agent bash tool environment captures secrets at process start — updating GITHUB_TOKEN in Replit Secrets doesn't refresh the running agent bash environment. Always delegate actual GitHub API pushes to Shell commands when the token is needed.
