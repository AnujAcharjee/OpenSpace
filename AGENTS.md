# OpenSpace Workspace Directives

## 1. Commit & Deployment Safety Protocol
- **NEVER** run `git commit`, `git push`, or trigger deployments autonomously.
- **ONLY** commit when the user explicitly requests it (e.g. *"commit this"*, *"make a commit"*), or after explicitly asking for permission and getting user approval.
- **NEVER** deploy services or run production database migrations without explicit confirmation.
- **GitHub Actions Deployment Options**:
  - **Default**: On push to `main`, tests run and Docker images are built and pushed to Docker Hub (`anuj304/openspace:<service>`), but **EC2 deployment is skipped**.
  - **Deploy to EC2**: Add `[deploy]` or `[deploy-ec2]` to the commit message (or trigger manually via `workflow_dispatch` in GitHub Actions).
  - **Skip Docker Build & Push**: Add `[skip deploy]`, `[skip-deploy]`, `[no deploy]`, or `[skip cd]` to commit message.
  - **Skip entire CI/CD**: Add `[skip ci]` or `[ci skip]`.
  - Frontend (`apps/web2.0/**`) and documentation (`**/*.md`) commits automatically skip deployment via `paths-ignore`.
- Full details in [`.agents/rules/deploy-and-commit-safety.md`](.agents/rules/deploy-and-commit-safety.md).

## 2. Web2.0 Redesign Rules
- **Functional Preservation**: Visual redesign only. Preserve 100% of existing functionality, routes, APIs, WebSocket contracts, and Zustand state logic from `apps/web`. See [`.agents/rules/frontend-preservation.md`](.agents/rules/frontend-preservation.md).
- **Illustrated Aesthetics**: Follow the colored-pencil & ink illustrated stationery design system. See [`.agents/rules/frontend-aesthetics.md`](.agents/rules/frontend-aesthetics.md).

## 3. Specialized Workspace Skills
Consult the project runbooks under [`.agents/skills/`](.agents/skills) for:
- Database & Prisma: `db-prisma-workflow`
- Real-time messaging & DLQ: `realtime-chat-architecture`
- API Gateway & service routes: `service-api-routing`
- Docker infrastructure & local dev: `dev-environment-docker`
- Monorepo testing & Vitest: `monorepo-quality-testing`
- Frontend development: `frontend-web-workflow`
