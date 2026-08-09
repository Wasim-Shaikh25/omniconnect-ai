"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface JsonViewerProps {
  data: unknown;
  maxDepth?: number;
  defaultExpandedDepth?: number;
  depth?: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function JsonViewer({
  data,
  maxDepth = 6,
  defaultExpandedDepth = 1,
  depth = 0,
}: JsonViewerProps) {
  const [expanded, setExpanded] = useState(depth < defaultExpandedDepth);

  if (data === null || data === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (typeof data === "string") {
    if (data.length === 0) return <span className="text-muted-foreground">""</span>;
    return <span className="whitespace-pre-wrap break-words">{data}</span>;
  }

  if (typeof data === "number" || typeof data === "bigint") {
    return <span>{Number(data).toLocaleString()}</span>;
  }

  if (typeof data === "boolean") {
    return <span>{data ? "Yes" : "No"}</span>;
  }

  if (data instanceof Date) {
    return <span>{data.toLocaleString()}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground">[]</span>;
    if (depth >= maxDepth) {
      return <span className="text-muted-foreground">[{data.length} items]</span>;
    }
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>[{data.length}]</span>
        </button>
        {expanded && (
          <ul className="ml-4 mt-1 space-y-1 border-l pl-2">
            {data.map((item, index) => (
              <li key={index}>
                <span className="text-xs text-muted-foreground mr-1">{index}.</span>
                <JsonViewer
                  data={item}
                  maxDepth={maxDepth}
                  defaultExpandedDepth={defaultExpandedDepth}
                  depth={depth + 1}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (isPlainObject(data)) {
    const entries = Object.entries(data);
    if (entries.length === 0) return <span className="text-muted-foreground">{"{}"}</span>;
    if (depth >= maxDepth) {
      return <span className="text-muted-foreground">{`{${entries.length} fields}`}</span>;
    }
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>{`{${entries.length}}`}</span>
        </button>
        {expanded && (
          <dl className="ml-4 mt-1 grid grid-cols-[minmax(0,12rem)_1fr] gap-x-4 gap-y-1 border-l pl-2 text-sm">
            {entries.map(([key, value]) => (
              <div key={key} className="col-span-2 grid grid-cols-[minmax(0,12rem)_1fr] gap-x-4">
                <dt className="truncate font-medium text-muted-foreground" title={key}>
                  {key}
                </dt>
                <dd className="break-words">
                  <JsonViewer
                    data={value}
                    maxDepth={maxDepth}
                    defaultExpandedDepth={defaultExpandedDepth}
                    depth={depth + 1}
                  />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  return <span className="whitespace-pre-wrap break-words">{String(data)}</span>;
}
