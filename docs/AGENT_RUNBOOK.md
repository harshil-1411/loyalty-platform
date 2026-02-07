# Agent runbook

How to work as one member of an autonomous agent team on the Loyalty Management Platform. The project uses a shared Git repository and follows [git-flow](.cursor/rules/git-branching-model.mdc).

## Mission

Build the Loyalty Management Platform per [docs/PRD.md](PRD.md) and [docs/ARCHITECTURE.md](ARCHITECTURE.md). Deploy with AWS CDK. All feature work happens on `feature/*` branches from `develop`; never commit feature work directly to `main` or `develop`.

## Coordination rules

1. **Branching**  
   Follow [.cursor/rules/git-branching-model.mdc](.cursor/rules/git-branching-model.mdc). Create feature branches from `develop`:  
   `git checkout develop && git pull origin develop && git checkout -b feature/<name> develop`

2. **Pick a task**  
   Read [TASKS.md](../TASKS.md), run `git pull origin develop`, and list `current_tasks/*.lock`. Choose a task that has **no lock file** and is next in order.

3. **Lock**  
   Create a lock file: `current_tasks/task-<id>-<slug>.lock`  
   Example: `task-0-4-setup-cdk.lock`  
   Content (one line or multiple): `agent=<id>, branch=feature/<name>, started=<ISO8601>`

4. **Work**  
   Implement on your `feature/<name>` branch. Run tests and lint locally before committing.

5. **Commit and merge**  
   Use clear commit messages (e.g. "Add API Gateway and hello Lambda"). Push the branch and open a Merge Request to `develop`, or merge with `git merge --no-ff feature/<name>` per your workflow. Ensure CI (lint, tests, `cdk synth`) passes.

6. **Unlock**  
   After the task is merged to `develop`, remove the lock file in a commit (same MR or follow-up).

7. **If stuck**  
   Add an entry to [FAILED_TASKS.md](../FAILED_TASKS.md) with task id, short description, and blocker/dependencies. Remove your lock file so others can pick other tasks or retry later.

8. **Progress**  
   Append to [PROGRESS.md](../PROGRESS.md): task id, short description, branch, and commit or timestamp.

## Testing

- Run unit tests per package (e.g. `npm run test` in `packages/api`, `packages/web`).
- Run lint (e.g. `npm run lint`) before pushing.
- Ensure `cdk synth` succeeds in `packages/infra` when you change infrastructure.

## Output expectations

- Clean, linted code.
- Passing tests.
- Updated documentation where relevant.
- Meaningful commits and MRs.

## Quick reference

| Action | Where |
|--------|--------|
| See all tasks | [TASKS.md](../TASKS.md) |
| See what’s in progress | `current_tasks/*.lock` |
| Log completion | [PROGRESS.md](../PROGRESS.md) |
| Log blockage | [FAILED_TASKS.md](../FAILED_TASKS.md) |
| How to branch/merge | [.cursor/rules/git-branching-model.mdc](.cursor/rules/git-branching-model.mdc) |
