#!/usr/bin/env python3
"""Mechanical migration pass for the V2 schema cleanup.

Renames old Organization/Store/Integration identifiers to the new
User/Project/EcommerceConnection model names across .ts/.tsx source files.
This is intentionally a blunt pass; edge cases are fixed manually afterwards.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_GLOBS = ["src/**/*.ts", "src/**/*.tsx", "scripts/**/*.ts"]

REPLACEMENTS = [
    # Model accessors
    (r"\bprisma\.organization\b", "prisma.user"),
    (r"\bprisma\.store\b", "prisma.project"),
    (r"\bprisma\.integration\b", "prisma.ecommerceConnection"),
    # Generated Prisma types
    (r"\bPrisma\.Organization\b", "Prisma.User"),
    (r"\bPrisma\.Store\b", "Prisma.Project"),
    (r"\bPrisma\.Integration\b", "Prisma.EcommerceConnection"),
    (r"\bPrisma\.StoreIntegration\b", "Prisma.EcommerceConnection"),
    # Record / tenant identifiers
    (r"\borganizationId\b", "userId"),
    (r"\bstoreId\b", "projectId"),
]


def migrate_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    original = text
    for pattern, replacement in REPLACEMENTS:
        text = re.sub(pattern, replacement, text)
    if text != original:
        path.write_text(text, encoding="utf-8")
        return 1
    return 0


def main() -> None:
    changed = 0
    for glob in SOURCE_GLOBS:
        for path in ROOT.glob(glob):
            if path.name == __file__ or "node_modules" in path.parts:
                continue
            changed += migrate_file(path)
    print(f"Migrated {changed} files")


if __name__ == "__main__":
    main()
