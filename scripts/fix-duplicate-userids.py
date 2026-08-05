#!/usr/bin/env python3
"""Remove duplicated `userId` properties that were produced by the mechanical
`organizationId` -> `userId` rename in files that already had a `userId`.

For each file with duplicate `userId` errors, we read `git diff -U0 HEAD -- file`
and drop any added `+userId` line whose corresponding removed line was
`organizationId`. This deletes the redundant org-scoped field entirely,
leaving the original `userId` field in place.
"""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

FILES = [
    "src/modules/ai/application/ask-business-brain.ts",
    "src/modules/ai/application/brain-memory.ts",
    "src/modules/ai/application/ports.ts",
    "src/modules/ai/infrastructure/brain-memory.repository.ts",
    "src/modules/ai/presentation/actions.ts",
    "src/modules/analytics/application/queries.ts",
    "src/modules/intelligence/application/action-plan.ts",
    "src/modules/intelligence/application/ports.ts",
    "src/modules/intelligence/application/quality-assurance.ts",
    "src/modules/intelligence/application/validation-driven.ts",
    "src/modules/intelligence/domain/types.ts",
    "src/modules/intelligence/infrastructure/repositories_extended.ts",
    "src/modules/intelligence/infrastructure/thin-slice.ts",
    "src/modules/intelligence/presentation/actions.ts",
    "src/modules/support/application/ports.ts",
    "src/modules/support/application/service.ts",
    "src/modules/support/infrastructure/repository.ts",
    "src/modules/users/application/data-export.ts",
    "src/modules/users/application/ports.ts",
    "src/modules/users/infrastructure/user.repository.ts",
    "src/shared/observability/system-log.ts",
]


def should_drop(hunk: str) -> bool:
    removed = re.findall(r"^-(.*)$", hunk, re.MULTILINE)
    added = re.findall(r"^\+(.*)$", hunk, re.MULTILINE)
    if len(removed) != 1 or len(added) != 1:
        return False
    return bool(re.search(r"\borganizationId\b", removed[0])) and bool(re.search(r"\buserId\b", added[0]))


def line_to_drop(hunk: str) -> int | None:
    # hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    m = re.search(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", hunk, re.MULTILINE)
    if not m:
        return None
    new_start = int(m.group(1))
    # count added lines before the one we want; with -U0 one added line
    added_before = 0
    for line in hunk.splitlines():
        if line.startswith("+"):
            added_before += 1
    return new_start + added_before - 1


def process_file(rel: str) -> int:
    path = ROOT / rel
    diff = subprocess.run(
        ["git", "diff", "-U0", "HEAD~1", "--", rel],
        cwd=ROOT,
        capture_output=True,
        text=True,
    ).stdout
    if not diff:
        return 0
    lines = path.read_text(encoding="utf-8").splitlines()
    drops: list[int] = []
    # Split diff into hunks
    hunks = re.split(r"(?=@@ -\d+)", diff)
    for hunk in hunks:
        if not hunk.startswith("@@"):
            continue
        if should_drop(hunk):
            idx = line_to_drop(hunk)
            if idx is not None:
                drops.append(idx)
    if not drops:
        return 0
    # drop in reverse order to preserve indices
    for idx in sorted(set(drops), reverse=True):
        if 1 <= idx <= len(lines):
            del lines[idx - 1]
    path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    return len(drops)


def main() -> None:
    total = 0
    for rel in FILES:
        n = process_file(rel)
        if n:
            print(f"{rel}: dropped {n} added userId line(s)")
            total += n
    print(f"Total dropped lines: {total}")


if __name__ == "__main__":
    main()
