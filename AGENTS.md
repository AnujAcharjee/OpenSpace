# OpenSpace Workspace Directives

## 1. Commit & Deployment Safety Protocol
- **NEVER** run `git commit`, `git push`, or trigger deployments autonomously.
- **ONLY** commit when the user explicitly requests it (e.g. *"commit this"*, *"make a commit"*), or after explicitly asking for permission and getting user approval.
- **NEVER** deploy services or run production database migrations without explicit confirmation.
- **GitHub Actions Commit Options**:
  - Skip backend deployment: add `[skip deploy]`, `[skip-deploy]`, `[no deploy]`, or `[skip cd]` to commit message.
  - Skip entire CI/CD: add `[skip ci]` or `[ci skip]`.
  - Frontend (`project/apps/web/**`) and documentation (`**/*.md`) commits automatically skip deployment via `paths-ignore`.
- Full details in [`.agents/rules/deploy-and-commit-safety.md`](project/.agents/rules/deploy-and-commit-safety.md).

## 2. Web-2 Redesign Rules
- **Functional Preservation**: Visual redesign only. Preserve 100% of existing functionality, routes, APIs, WebSocket contracts, and Zustand state logic from `project/apps/web`. See [`.agents/rules/frontend-preservation.md`](project/.agents/rules/frontend-preservation.md).
- **Illustrated Aesthetics**: Follow the colored-pencil & ink illustrated stationery design system. See [`.agents/rules/frontend-aesthetics.md`](project/.agents/rules/frontend-aesthetics.md).

## 3. Specialized Workspace Skills
Consult the project runbooks under [`.agents/skills/`](project/.agents/skills) for:
- Database & Prisma: `db-prisma-workflow`
- Real-time messaging & DLQ: `realtime-chat-architecture`
- API Gateway & service routes: `service-api-routing`
- Docker infrastructure & local dev: `dev-environment-docker`
- Monorepo testing & Vitest: `monorepo-quality-testing`
- Frontend development: `frontend-web-workflow`
