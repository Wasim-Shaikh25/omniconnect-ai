import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { JsonViewer } from "./json-viewer";

describe("JsonViewer", () => {
  it("renders primitives correctly", () => {
    expect(renderToString(<JsonViewer data={null} />)).toContain("—");
    expect(renderToString(<JsonViewer data={undefined} />)).toContain("—");
    expect(renderToString(<JsonViewer data={42} />)).toContain("42");
    expect(renderToString(<JsonViewer data={1_234_567} />)).toContain("1,234,567");
    expect(renderToString(<JsonViewer data="hello" />)).toContain("hello");
    expect(renderToString(<JsonViewer data={true} />)).toContain("Yes");
    expect(renderToString(<JsonViewer data={false} />)).toContain("No");
  });

  it("renders an array with index labels", () => {
    const html = renderToString(<JsonViewer data={["a", "b"]} />);
    expect(html).toMatch(/0<!--[^>]*-->\.\s*<\/span>/);
    expect(html).toMatch(/1<!--[^>]*-->\.\s*<\/span>/);
    expect(html).toContain("a");
    expect(html).toContain("b");
  });

  it("renders an object as a key/value grid", () => {
    const html = renderToString(<JsonViewer data={{ name: "x", count: 3 }} />);
    expect(html).toContain("name");
    expect(html).toContain("count");
    expect(html).toContain("x");
    expect(html).toContain("3");
  });

  it("respects defaultExpandedDepth to collapse nested objects", () => {
    const data = { a: { b: { c: 1 } } };
    const html = renderToString(<JsonViewer data={data} defaultExpandedDepth={0} />);
    expect(html).toContain("a");
    // collapsed deeper levels only show a placeholder count
    expect(html).toContain("{1}");
  });

  it("truncates beyond maxDepth", () => {
    const data = { a: { b: { c: { d: 1 } } } };
    const html = renderToString(<JsonViewer data={data} maxDepth={2} defaultExpandedDepth={10} />);
    expect(html).toContain("{1 fields}");
  });
});
