"use client";

import * as React from "react";
import Link from "next/link";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const patterns: Array<{ regex: RegExp; render: (match: RegExpExecArray, key: number) => React.ReactNode }> = [
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)/g,
      render: (match, key) => (
        <Link key={key} href={match[2]} className="text-primary underline" target="_blank" rel="noreferrer">
          {match[1]}
        </Link>
      ),
    },
    {
      regex: /`([^`]+)`/g,
      render: (match, key) => (
        <code key={key} className="rounded bg-muted px-1 py-0.5 text-sm font-mono">
          {match[1]}
        </code>
      ),
    },
    {
      regex: /\*\*([^*]+)\*\*/g,
      render: (match, key) => (
        <strong key={key} className="font-semibold">
          {match[1]}
        </strong>
      ),
    },
    {
      regex: /\*([^*]+)\*/g,
      render: (match, key) => (
        <em key={key} className="italic">
          {match[1]}
        </em>
      ),
    },
  ];

  let lastIndex = 0;
  let key = 0;

  while (lastIndex < text.length) {
    let earliest: { index: number; match: RegExpExecArray; render: (m: RegExpExecArray, k: number) => React.ReactNode } | null = null;

    for (const pattern of patterns) {
      pattern.regex.lastIndex = lastIndex;
      const match = pattern.regex.exec(text);
      if (match && (earliest === null || match.index < earliest.index)) {
        earliest = { index: match.index, match, render: pattern.render };
      }
    }

    if (!earliest) {
      nodes.push(<span key={`text-${key}`}>{escapeHtml(text.slice(lastIndex))}</span>);
      break;
    }

    if (earliest.index > lastIndex) {
      nodes.push(<span key={`text-${key}`}>{escapeHtml(text.slice(lastIndex, earliest.index))}</span>);
      key++;
    }

    nodes.push(earliest.render(earliest.match, key));
    key++;
    lastIndex = earliest.index + earliest.match[0].length;
  }

  return nodes.length === 0 ? null : nodes;
}

function renderBlock(line: string, index: number): React.ReactNode {
  const trimmed = line.trim();

  if (trimmed.startsWith("### ")) {
    return (
      <h3 key={index} className="mt-4 mb-2 text-lg font-semibold">
        {renderInline(trimmed.slice(4))}
      </h3>
    );
  }
  if (trimmed.startsWith("## ")) {
    return (
      <h2 key={index} className="mt-5 mb-2 text-xl font-semibold">
        {renderInline(trimmed.slice(3))}
      </h2>
    );
  }
  if (trimmed.startsWith("# ")) {
    return (
      <h1 key={index} className="mt-6 mb-3 text-2xl font-bold">
        {renderInline(trimmed.slice(2))}
      </h1>
    );
  }
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    return (
      <li key={index} className="ml-5 list-disc">
        {renderInline(trimmed.slice(2))}
      </li>
    );
  }
  if (/^\d+\.\s/.test(trimmed)) {
    return (
      <li key={index} className="ml-5 list-decimal">
        {renderInline(trimmed.replace(/^\d+\.\s/, ""))}
      </li>
    );
  }
  if (trimmed === "") {
    return <div key={index} className="h-2" />;
  }

  return <p key={index} className="mb-2 leading-relaxed">{renderInline(trimmed)}</p>;
}

export function Markdown({ content }: { content: string }): React.ReactElement {
  const lines = content.split("\n");
  return <div className="prose prose-sm max-w-none dark:prose-invert">{lines.map(renderBlock)}</div>;
}
