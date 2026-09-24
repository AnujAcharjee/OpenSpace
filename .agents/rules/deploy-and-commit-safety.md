---
trigger: always_on
description: Strict safety rule requiring explicit user confirmation before committing code, pushing to git repositories, or deploying services.
---

# Git Commit & Deployment Safety Rule

> [!CAUTION]
> **Zero Autonomous Commits or Deploys**: The agent must **NEVER** autonomously create git commits, push to remote repositories, or trigger deployment workflows without explicit user instruction.

---

## 1. Git Commit & Push Restrictions

1. **Explicit User Instruction Only**:
   - Only execute `git commit`, `git push`, `git tag`, or stash/rebase operations when the user **explicitly asks** to commit or push (e.g., *"commit these changes"*, *"commit and push"*, *"make a commit"*).
   - If the user has not explicitly requested a commit, do **NOT** commit changes at the end of a task or implementation turn.

2. **Pre-Commit Confirmation & Transparency**:
   - Before executing a commit, clearly present:
     - The staged/modified files (`git status`).
     - The proposed commit message following Conventional Commits format.
   - If unsure whether the user wants changes committed, **ask first**.

3. **Branch Protection & Pushes**:
   - Never run force-pushes (`git push --force`) under any circumstance without explicit user confirmation.

---

## 2. Deployment & Production Safety

1. **Deployments Require Explicit Approval**:
   - Never trigger production builds, Docker image pushes (`docker push`), Caddy reload in production, or cloud deployments autonomously.
   - Always ask the user for confirmation before running any deployment script or production deployment step.

2. **Database Migrations on Production**:
   - Commands that modify production databases (such as `prisma migrate deploy`, `db:prod:migrate`, or database resets) must be explicitly confirmed with the user before execution.
   - Local prototyping commands (`prisma migrate dev` or `db:push` against local dev Docker Postgres) are permitted during development, but any command that targets a non-local or staging/production database requires prior user confirmation.