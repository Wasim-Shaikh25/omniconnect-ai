import { eventBus } from "@/shared/events";
import type { GoalRepository } from "./ports";
import type { MetricService } from "./metrics";
import { GoalPacingChanged } from "../domain/events";
import type { GoalRecord, GoalPacing } from "../domain/types";

export interface GoalServiceInput {
  goals: GoalRepository;
  metrics: MetricService;
}

export function makeGoalService(input: GoalServiceInput) {
  return {
    async list(userId: string, projectId?: string, limit = 20): Promise<GoalRecord[]> {
      return input.goals.list(userId, projectId, limit);
    },

    async create(
      userId: string,
      projectId: string | undefined,
      name: string,
      targetMetric: string,
      target: number | null,
      endDate: Date | null,
      ownerUserId?: string,
    ): Promise<GoalRecord> {
      const baselineSnapshot = await input.metrics.getMetric(targetMetric, userId, projectId ?? null);
      const baseline = baselineSnapshot?.value ?? null;

      const pacing: GoalPacing = {
        current: baseline ?? 0,
        projected: baseline ?? 0,
        onTrack: true,
      };

      return input.goals.save({
        userId,
        projectId: projectId ?? null,
        name,
        targetMetric,
        baseline,
        target,
        startDate: new Date(),
        endDate,
        ownerUserId: ownerUserId ?? null,
        pacing,
        status: "ACTIVE",
      });
    },

    async updatePacing(id: string, userId: string): Promise<GoalRecord> {
      const goal = await input.goals.findById(id, userId);
      if (!goal) throw new Error("Goal not found");

      const snapshot = await input.metrics.getMetric(goal.targetMetric, goal.userId, goal.projectId);
      const current = snapshot?.value ?? 0;
      const projected = current;
      const onTrack = goal.target !== null && goal.target > 0 ? current >= goal.target * 0.5 : true;

      let status = goal.status;
      if (goal.target !== null && current >= goal.target) status = "ACHIEVED";
      else if (goal.endDate && new Date() > goal.endDate && current < (goal.target ?? 0)) status = "MISSED";

      const pacing: GoalPacing = { current, projected, onTrack };
      const updated = await input.goals.updatePacing(goal.id, userId, pacing, status);

      await eventBus.publish(new GoalPacingChanged(goal.id, { goal: updated }));
      return updated;
    },
  };
}

export type GoalService = ReturnType<typeof makeGoalService>;
