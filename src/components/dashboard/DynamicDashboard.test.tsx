import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { DynamicDashboard } from "./DynamicDashboard";
import { sizeToGridClass } from "./size-to-grid-class";
import type { DashboardSchema } from "@/modules/ai";

const sampleSchema: DashboardSchema = {
  title: "Test Dashboard",
  widgets: [
    {
      type: "kpi",
      title: "Revenue",
      size: "small",
      data: { value: 1234, label: "Revenue", change: 12, changeLabel: "vs last week" },
    },
    {
      type: "line_chart",
      title: "Trend",
      size: "medium",
      data: {
        labels: ["Mon", "Tue", "Wed"],
        datasets: [{ label: "Sales", data: [10, 20, 15] }],
      },
    },
    {
      type: "bar_chart",
      title: "Compare",
      size: "large",
      data: {
        labels: ["A", "B"],
        datasets: [{ label: "Q1", data: [5, 8] }],
      },
    },
    {
      type: "pie_chart",
      title: "Share",
      size: "medium",
      data: {
        labels: ["X", "Y"],
        datasets: [{ label: "Slice", data: [30, 70] }],
      },
    },
    {
      type: "table",
      title: "Details",
      size: "full",
      data: {
        headers: ["Name", "Value"],
        rows: [
          { Name: "A", Value: 10 },
          { Name: "B", Value: 20 },
        ],
      },
    },
    {
      type: "sparkline",
      title: "Pulse",
      size: "small",
      data: {
        labels: ["1", "2", "3"],
        datasets: [{ label: "Pulse", data: [1, 2, 3] }],
      },
    },
  ],
};

describe("sizeToGridClass", () => {
  it("maps widget sizes to grid columns", () => {
    expect(sizeToGridClass("small")).toBe("col-span-12 sm:col-span-3");
    expect(sizeToGridClass("medium")).toBe("col-span-12 sm:col-span-6");
    expect(sizeToGridClass("large")).toBe("col-span-12 sm:col-span-9");
    expect(sizeToGridClass("full")).toBe("col-span-12");
    expect(sizeToGridClass("unknown")).toBe("col-span-12 sm:col-span-6");
  });
});

describe("DynamicDashboard", () => {
  it("renders the title and every widget type", () => {
    const html = renderToString(<DynamicDashboard schema={sampleSchema} />);
    expect(html).toContain("Test Dashboard");
    expect(html).toContain("Revenue");
    expect(html).toContain("1,234");
    expect(html).toContain("Trend");
    expect(html).toContain("Compare");
    expect(html).toContain("Share");
    expect(html).toContain("Details");
    expect(html).toContain("Pulse");
    expect(html).toContain("A");
    expect(html).toContain("B");
  });
});
