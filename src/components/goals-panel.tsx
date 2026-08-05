import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getGoalsAction, createGoalAction } from "@/modules/intelligence";
import type { GoalRecord } from "@/modules/intelligence";

function GoalRow({ goal }: { goal: GoalRecord }) {
  return (
    <li className="flex items-center justify-between rounded-md border p-3 text-sm">
      <div>
        <p className="font-medium">{goal.name}</p>
        <p className="text-xs text-muted-foreground">
          {goal.targetMetric} · baseline {goal.baseline ?? "—"} · target {goal.target ?? "—"}
        </p>
        {goal.pacing && (
          <p className="text-xs text-muted-foreground">
            Current {goal.pacing.current} · on track {goal.pacing.onTrack ? "Yes" : "No"}
          </p>
        )}
      </div>
      <span className="rounded px-2 py-0.5 text-xs font-medium bg-muted">{goal.status.toLowerCase()}</span>
    </li>
  );
}

export async function GoalsPanel({ projectId }: { projectId?: string }) {
  const { goals } = await getGoalsAction(projectId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Goals</CardTitle>
        <CardDescription>Track target metric pacing for this workspace or store.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createGoalAction} className="mb-4 grid gap-3 sm:grid-cols-4">
          {projectId && <input type="hidden" name="projectId" value={projectId} />}
          <div>
            <Label htmlFor="goalName" className="text-xs">Name</Label>
            <Input id="goalName" name="name" placeholder="e.g. 100 followers" required />
          </div>
          <div>
            <Label htmlFor="goalMetric" className="text-xs">Metric</Label>
            <Input id="goalMetric" name="targetMetric" placeholder="follower_count" required />
          </div>
          <div>
            <Label htmlFor="goalTarget" className="text-xs">Target</Label>
            <Input id="goalTarget" name="target" type="number" placeholder="100" />
          </div>
          <div>
            <Label htmlFor="goalEnd" className="text-xs">End date</Label>
            <Input id="goalEnd" name="endDate" type="date" />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" size="sm">
              Create goal
            </Button>
          </div>
        </form>

        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No goals yet.</p>
        ) : (
          <ul className="space-y-2">
            {goals.map((goal) => (
              <GoalRow key={goal.id} goal={goal} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
