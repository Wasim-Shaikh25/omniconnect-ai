import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ChartData,
  DashboardSchema,
  DashboardWidget,
  KPIData,
  TableData,
} from "@/modules/ai";
import { BarChartWidget } from "./BarChartWidget";
import { DataTableWidget } from "./DataTableWidget";
import { KPICard } from "./KPICard";
import { LineChartWidget } from "./LineChartWidget";
import { PieChartWidget } from "./PieChartWidget";
import { sizeToGridClass } from "./size-to-grid-class";
import { SparklineWidget } from "./SparklineWidget";

interface DynamicDashboardProps {
  schema: DashboardSchema;
}

function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  switch (widget.type) {
    case "kpi":
      return <KPICard data={widget.data as KPIData} />;
    case "line_chart":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartWidget data={widget.data as ChartData} />
          </CardContent>
        </Card>
      );
    case "bar_chart":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartWidget data={widget.data as ChartData} />
          </CardContent>
        </Card>
      );
    case "pie_chart":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartWidget data={widget.data as ChartData} />
          </CardContent>
        </Card>
      );
    case "table":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTableWidget data={widget.data as TableData} />
          </CardContent>
        </Card>
      );
    case "sparkline":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <SparklineWidget data={widget.data as ChartData} />
          </CardContent>
        </Card>
      );
    default:
      return null;
  }
}

export function DynamicDashboard({ schema }: DynamicDashboardProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{schema.title}</h2>
      <div className="grid grid-cols-12 gap-4">
        {schema.widgets.map((widget, index) => (
          <div key={index} className={sizeToGridClass(widget.size)}>
            <WidgetRenderer widget={widget} />
          </div>
        ))}
      </div>
    </div>
  );
}
