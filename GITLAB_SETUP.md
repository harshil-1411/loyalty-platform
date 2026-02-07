# GitLab + Cursor setup for this project

This project is wired to **https://gitlab.com/loyalty-group/loyalty**.

## 1. Connect Cursor to GitLab (recommended)

1. In Cursor, open **Settings** (⌘ + , on Mac).
2. Go to **Cursor Settings** → **Account** (or open the link below).
3. Open: **https://cursor.com/gitlab-connected** and sign in with your GitLab account when prompted.

This lets Cursor use your GitLab identity for git and (where supported) merge requests.

## 2. Get the repo content into this folder

The Git remote is already set. To pull the existing code (after Cursor is connected to GitLab, or after configuring credentials):

```bash
git fetch origin
git branch -M main   # optional: use main as default branch name
git checkout main    # or master, depending on the repo’s default branch
git pull origin main
```

If the repo is empty or you see “ref not found”, the remote may use a different default branch (e.g. `master`). Use:

```bash
git branch -a        # list remote branches
git checkout <branch-name>
git pull origin <branch-name>
```

## 3. Use GitLab from the terminal (HTTPS)

- **First time push/pull:** Git will ask for credentials.
- **Username:** your GitLab username.
- **Password:** use a **Personal Access Token**, not your GitLab password.
  - GitLab: **Settings** → **Access Tokens** → create a token with `read_repository` and `write_repository`.
  - Use that token as the password when Git prompts you.

## 4. Optional: SSH instead of HTTPS

If you prefer SSH:

```bash
git remote set-url origin git@gitlab.com:loyalty-group/loyalty.git
```

Ensure your SSH key is added in GitLab: **Settings** → **SSH Keys**.

## 5. Optional: GitLab MCP in Cursor (MRs, reviews)

For merge requests and code review inside Cursor:

1. In Cursor: **Settings** → **Developer** → **Edit Config** (or edit `~/.cursor/mcp.json`).
2. Add a GitLab MCP server (e.g. from [MCP Cursor](https://mcpcursor.com/server/gitlab-code-review-mcp-mcp)).
3. You’ll need a GitLab **Personal Access Token** with `read_api` (and optionally `write_api` for comments).

---

**Quick check:** Run `git remote -v` in this folder; you should see `origin` pointing to `https://gitlab.com/loyalty-group/loyalty.git`.
