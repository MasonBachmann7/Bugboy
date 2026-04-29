# BugBoy self-healing loop

The end-to-end demo: an error fires, bugstack opens a fix PR, CI validates
it, the PR auto-merges, Render redeploys, and the bug is gone — with no
human in the loop.

## The pipeline

```
HTTP request to BugBoy
        |
        v
intentional error
        |
        v
bugstack-sdk captures the error and posts to bugstack.ai
        |
        v
bugstack opens a PR with branch ai-fix-<hash>-<ts>
        |
        v
.github/workflows/ci.yml runs: install + lint (advisory) + next build
        |
        v
.github/workflows/auto-merge.yml fires on CI completion
   (only for branches matching ai-fix-*)
        |
        v
gh pr merge --squash --delete-branch
        |
        v
Render auto-deploys main
        |
        v
bugstack dashboard row flips to "Auto-deployed"
```

## The two workflows

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every PR
and on push to main:

- `npm ci`
- `npm run lint` — advisory only (`continue-on-error: true`). A lint
  warning won't block a fix from landing; the build step is the actual gate.
- `npm run build` — runs the Next.js build, which type-checks the whole
  tree. This is the hard gate; no fix lands if the project doesn't build.

[`.github/workflows/auto-merge.yml`](../.github/workflows/auto-merge.yml)
triggers on `workflow_run` of CI:

- Fires only when the CI run that just completed was on a `pull_request`
  event whose head branch starts with `ai-fix-`, and CI succeeded.
- Looks up the open PR for that branch, then squash-merges it with
  `gh pr merge --squash --delete-branch`. The merge commit subject is
  `Auto-deploy: Merge ai-fix-<...> into main` so the demo's existing log
  pattern stays consistent.

## GitHub repo settings to flip

These have to be set in the GitHub UI on the BugBoy repo. None of them
live in the repo itself.

**Settings > General > Pull Requests:**
- Allow squash merging — **on**
- Automatically delete head branches — **on** (the workflow already
  passes `--delete-branch`, this is just belt-and-suspenders)

**Settings > Actions > General:**
- Workflow permissions — **Read and write permissions**. Needed for the
  auto-merge job to push the merge commit and delete the branch.
- "Allow GitHub Actions to create and approve pull requests" — leave off
  unless you also want CI itself to open PRs.

**Settings > Branches > Branch protection for main (optional):**
- Adding "Require status checks to pass before merging" with `CI` selected
  forces *every* merger (bugstack itself, humans, this workflow) to wait
  for green CI. Without it, the auto-merge workflow still waits — but
  nothing prevents a separate actor from merging early. Recommended for a
  "real" loop, optional for the demo.

## Failure modes and how to spot them

| Symptom | Cause | Fix |
|---|---|---|
| PR opens, CI green, no merge | auto-merge.yml not running | Check Actions tab → "Auto-merge ai-fix PRs" — usually a permissions issue (workflow permissions not "Read and write"). |
| PR opens, CI red, no merge | bugstack's fix doesn't build | Open the failing CI run; the diff is the hint. Either bugstack misread the bug or the bug needs a hand-holding tweak in the fixture. |
| PR merges, no Render deploy | Render not connected to repo, or auto-deploy disabled | Render dashboard → service → Settings → Build & Deploy. |
| PR merges, deploy succeeds, dashboard still says "PR ready" | bugstack hasn't picked up the merge | Usually clears within a few minutes; if not, check the project's webhook in bugstack settings. |

## Watching one go through

After triggering an error:

```bash
DEMO_TARGET_URL=https://bugboy-t49j.onrender.com npm run demo:errors -- --bug=5
```

Then in another window watch:

```bash
# (requires gh CLI)
gh pr list --search "head:ai-fix-" --state open
gh run watch
```

Within ~3-5 minutes (capture → PR → CI → merge → deploy) the dashboard
row should flip from "PR ready" to "Auto-deployed".
