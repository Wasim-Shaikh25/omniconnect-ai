import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { PieChartWidget } from "./PieChartWidget";
import type { ChartData } from "@/modules/ai";

const singleSliceData: ChartData = {
  labels: ["Only"],
  datasets: [{ label: "All", data: [100] }],
};

describe("PieChartWidget", () => {
  it("renders a visible arc for a 100% slice instead of a collapsed path", () => {
    const html = renderToString(<PieChartWidget data={singleSliceData} />);
    const pathMatch = html.match(/d="([^"]+)"/);
    expect(pathMatch).toBeTruthy();
    const d = pathMatch?.[1] ?? "";

    const arcMatch = d.match(
      /M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) A 70 70 0 (\d+) (\d+) ([\d.]+) ([\d.]+) Z$/,
    );
    expect(arcMatch).toBeTruthy();

    const startX = Number(arcMatch?.[3]);
    const startY = Number(arcMatch?.[4]);
    const endX = Number(arcMatch?.[7]);
    const endY = Number(arcMatch?.[8]);
    expect(startX === 80 && startY === 10 && endX === 80 && endY === 10).toBe(false);
  });
});
