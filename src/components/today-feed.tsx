import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TodayActionCard } from "@/components/today-action-card";
import { getTodayActionsAction } from "@/modules/intelligence";

export async function TodayFeed({ storeId }: { storeId?: string }) {
  const { actions } = await getTodayActionsAction(storeId);

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-lg">Today</CardTitle>
        <CardDescription>
          Prioritized actions for today, ranked by objective and confidence. Complete or skip to teach the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No actions for today yet. Connect a store and generate marketing memory to populate your daily rhythm.
          </p>
        ) : (
          <ul className="space-y-3">
            {actions.map((action) => (
              <TodayActionCard key={action.id} action={action} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
