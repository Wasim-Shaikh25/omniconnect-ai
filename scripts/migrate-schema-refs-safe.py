#!/usr/bin/env python3
"""Safe mechanical migration: skip files that already contain `userId`
so we don't create duplicate-identifier collisions.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_GLOBS = ["src/**/*.ts", "src/**/*.tsx"]

REPLACEMENTS = [
    (r"\bprisma\.organization\b", "prisma.user"),
    (r"\bprisma\.store\b", "prisma.project"),
    (r"\bprisma\.integration\b", "prisma.ecommerceConnection"),
    (r"\bPrisma\.Organization\b", "Prisma.User"),
    (r"\bPrisma\.Store\b", "Prisma.Project"),
    (r"\bPrisma\.Integration\b", "Prisma.EcommerceConnection"),
    (r"\bPrisma\.StoreIntegration\b", "Prisma.EcommerceConnection"),
    (r"\borganizationId\b", "userId"),
    (r"\bstoreId\b", "projectId"),
]


def migrate_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    original = text
    # Skip files that already use userId (actor/submitter cases that need manual review)
    if re.search(r"\buserId\b", text):
        return 0
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
            if "node_modules" in path.parts or path.name == __file__:
                continue
            changed += migrate_file(path)
    print(f"Migrated {changed} files")


if __name__ == "__main__":
    main()
