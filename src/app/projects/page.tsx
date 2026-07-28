"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  createProjectAction,
  listProjectsAction,
  archiveProjectAction,
  getProjectAction,
  addProjectMemberAction,
  removeProjectMemberAction,
  type ProjectActionState,
  type ProjectRecord,
  type ProjectMemberRecord,
} from "@/modules/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ROLES = ["OWNER", "ADMIN", "EDITOR", "VIEWER"] as const;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [membersByProject, setMembersByProject] = useState<Record<string, ProjectMemberRecord[]>>({});

  async function loadProjects() {
    const list = await listProjectsAction();
    setProjects(list);
    const members: Record<string, ProjectMemberRecord[]> = {};
    await Promise.all(
      list.map(async (project) => {
        const result = await getProjectAction(project.id);
        members[project.id] = result?.members ?? [];
      }),
    );
    setMembersByProject(members);
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const [state, formAction, pending] = useActionState<ProjectActionState, FormData>(
    async (prev, formData) => {
      const result = await createProjectAction(prev, formData);
      if (result.ok) await loadProjects();
      return result;
    },
    {},
  );

  async function handleArchive(projectId: string) {
    const form = new FormData();
    form.append("projectId", projectId);
    await archiveProjectAction({}, form);
    await loadProjects();
  }

  const [addMemberState, addMemberAction, addMemberPending] = useActionState<
    ProjectActionState,
    FormData
  >(
    async (prev, formData) => {
      const result = await addProjectMemberAction(prev, formData);
      if (result.ok) await loadProjects();
      return result;
    },
    {},
  );

  async function handleRemoveMember(memberId: string) {
    const form = new FormData();
    form.append("memberId", memberId);
    await removeProjectMemberAction({}, form);
    await loadProjects();
  }

  return (
    <main className="container mx-auto max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-bold">Projects</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription>One Instagram account per project inside your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Summer collection"
                aria-invalid={!!state?.fieldErrors?.name}
                aria-describedby={state?.fieldErrors?.name ? "name-error" : undefined}
              />
              {state?.fieldErrors?.name && (
                <p id="name-error" className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.name.join(", ")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Optional"
                aria-invalid={!!state?.fieldErrors?.description}
                aria-describedby={state?.fieldErrors?.description ? "description-error" : undefined}
              />
              {state?.fieldErrors?.description && (
                <p id="description-error" className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.description.join(", ")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagramHandle">Instagram handle</Label>
              <Input
                id="instagramHandle"
                name="instagramHandle"
                placeholder="@yourbrand"
                aria-invalid={!!state?.fieldErrors?.instagramHandle}
                aria-describedby={state?.fieldErrors?.instagramHandle ? "instagramHandle-error" : undefined}
              />
              {state?.fieldErrors?.instagramHandle && (
                <p id="instagramHandle-error" className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.instagramHandle.join(", ")}
                </p>
              )}
            </div>
            {state?.error && (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            )}
            {state?.ok && (
              <p className="text-sm text-muted-foreground" role="status">
                Project created.
              </p>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <CardDescription>
                {project.instagramHandle ? `${project.instagramHandle} · ` : ""}
                {project.description ?? "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/stores/${project.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Manage store
                </Link>
                <Button variant="outline" size="sm" onClick={() => handleArchive(project.id)}>
                  Archive
                </Button>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-2 text-sm font-semibold">Members</h3>
                <ul className="mb-4 space-y-1 text-sm">
                  {(membersByProject[project.id] ?? []).length === 0 && (
                    <li className="text-muted-foreground">No members yet.</li>
                  )}
                  {(membersByProject[project.id] ?? []).map((member) => (
                    <li key={member.id} className="flex items-center justify-between">
                      <span>
                        {member.userId} · {member.role}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>

                <form action={addMemberAction} className="flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="projectId" value={project.id} />
                  <div className="flex flex-1 flex-col gap-1">
                    <Input
                      id={`userId-${project.id}`}
                      name="userId"
                      placeholder="User ID"
                      required
                      className="w-full"
                      aria-invalid={!!addMemberState?.fieldErrors?.userId}
                      aria-describedby={addMemberState?.fieldErrors?.userId ? `userId-${project.id}-error` : undefined}
                    />
                    {addMemberState?.fieldErrors?.userId && (
                      <p id={`userId-${project.id}-error`} className="text-sm text-destructive" role="alert">
                        {addMemberState.fieldErrors.userId.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 sm:w-[140px]">
                    <select
                      id={`role-${project.id}`}
                      name="role"
                      defaultValue="EDITOR"
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-invalid={!!addMemberState?.fieldErrors?.role}
                      aria-describedby={addMemberState?.fieldErrors?.role ? `role-${project.id}-error` : undefined}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    {addMemberState?.fieldErrors?.role && (
                      <p id={`role-${project.id}-error`} className="text-sm text-destructive" role="alert">
                        {addMemberState.fieldErrors.role.join(", ")}
                      </p>
                    )}
                  </div>
                  <Button type="submit" size="sm" disabled={addMemberPending}>
                    {addMemberPending ? "…" : "Add"}
                  </Button>
                </form>
                {addMemberState?.error && (
                  <p className="text-sm text-destructive" role="alert">
                    {addMemberState.error}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
