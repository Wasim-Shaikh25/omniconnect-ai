---
description: Workspace & Project System
---

# REQ-0077: Workspace & Project System

- **Status:** Draft
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0077-workspace-project-system.md`
- **Related Tracker:** `docs/trackers/TRACKER-0077-workspace-project-system.md`
- **Supersedes:** `REQ-0011-users-organizations-stores.md`
- **Last updated:** 2026-08-05

## 1. Summary

Replace Organization/Store hierarchy with User → Workspace → Project. A Workspace is an organizational folder. A Project is bound to exactly one Meta account ID and is the scope for all features (e-commerce connection, AI config, analytics, messaging). Plan limits enforced at the user level across all workspaces.

## 2. Goals

- Workspace CRUD with user-level plan limit enforcement.
- Project CRUD with cross-workspace plan limit enforcement (total projects, not per-workspace).
- Default AI configuration auto-created per project.
- Sidebar workspace/project selector dropdown.
- Three billing tiers: Free (1 workspace, 1 project, 20 AI/day), Pro (unlimited workspaces, 10 projects, 200 AI/day), Business (unlimited everything).

## 3. Non-Goals

- Multi-user workspace sharing.
- Workspace transfer between users.

## 4. User Stories

- As a user, I want to create multiple workspaces to organize my brands/businesses.
- As a user, I want to create projects within workspaces, each linked to a unique Meta account.
- As a user, I want clear error messages when I hit plan limits.
- As a user, I want to switch between workspaces and projects via a sidebar dropdown.

## 5. Acceptance Criteria

- [ ] Workspace model in Prisma with `userId`, `name`, timestamps.
- [ ] Project model with `workspaceId`, `metaAccountId`, `metaAccessToken`, timestamps.
- [ ] Create workspace checks `user.plan.maxWorkspaces` against existing count.
- [ ] Create project checks `user.plan.maxProjects` against total across ALL workspaces.
- [ ] Auto-create default AIConfiguration when a project is created.
- [ ] Workspace/project selector UI in sidebar.
- [ ] Plan limit error messages include plan name and upgrade CTA.

## 6. Scope & Dependencies

- Modules: `workspaces` (new), `billing`
- Depends on: REQ-0090 (cleanup — Organization/Store must be removed first)
- Blocks: REQ-0078 through REQ-0089 (all features scoped to Project)

## 7. Code Snippets

### Workspace Creation with Plan Enforcement

```ts
// src/modules/workspaces/application/create-workspace.ts

async function createWorkspace(userId: string, input: CreateWorkspaceInput) {
  const user = await userRepo.findWithPlan(userId);
  const currentCount = await workspaceRepo.countByUser(userId);

  if (currentCount >= user.plan.maxWorkspaces) {
    throw new PlanLimitError(
      `Your ${user.plan.name} plan allows ${user.plan.maxWorkspaces} workspace(s). Upgrade to create more.`
    );
  }

  return workspaceRepo.create({ ...input, userId });
}
```

### Project Creation with Cross-Workspace Limit

```ts
// src/modules/workspaces/application/create-project.ts

async function createProject(userId: string, workspaceId: string, input: CreateProjectInput) {
  const workspace = await workspaceRepo.findByIdAndUser(workspaceId, userId);
  if (!workspace) throw new NotFoundError("Workspace not found");

  const totalProjects = await projectRepo.countByUser(userId);
  const user = await userRepo.findWithPlan(userId);

  if (totalProjects >= user.plan.maxProjects) {
    throw new PlanLimitError(
      `Your ${user.plan.name} plan allows ${user.plan.maxProjects} project(s). Upgrade to create more.`
    );
  }

  const project = await projectRepo.create({ ...input, workspaceId });
  await aiConfigService.createDefault(project.id);
  return project;
}
```

## 8. Open Questions

None — all resolved in planning sessions.
