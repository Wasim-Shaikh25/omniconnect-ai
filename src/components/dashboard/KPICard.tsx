import {
  Activity,
  BarChart3,
  DollarSign,
  Mail,
  MessageCircle,
  Percent,
  ShoppingCart,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KPIData } from "@/modules/ai";

const iconMap: Record<string, LucideIcon> = {
  DollarSign,
  Users,
  ShoppingCart,
  TrendingUp,
  MessageCircle,
  Percent,
  BarChart3,
  Activity,
  Mail,
};

interface KPICardProps {
  data: KPIData;
}

function formatValue(value: string | number): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US").format(value);
  }
  return value;
}

function changeColor(change: number): string {
  if (change > 0) return "text-green-600";
  if (change < 0) return "text-red-600";
  return "text-muted-foreground";
}

export function KPICard({ data }: KPICardProps) {
  const Icon = (data.icon ? iconMap[data.icon] : null) ?? BarChart3;
  const change = data.change ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {data.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{formatValue(data.value)}</p>
        {data.change !== undefined && (
          <p className={`text-xs ${changeColor(change)}`}>
            {change > 0 ? "+" : ""}
            {change} {data.changeLabel ?? "vs last period"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
