import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Enforce loose coupling: no deep imports into another module's internals.
      // Cross-module access must go through the module's public barrel (@/modules/<m>).
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/modules/*/domain/*",
                "@/modules/*/application/*",
                "@/modules/*/infrastructure/*",
                "@/modules/*/presentation/*",
                "**/modules/*/domain/*",
                "**/modules/*/application/*",
                "**/modules/*/infrastructure/*",
                "**/modules/*/presentation/*",
              ],
              message:
                "Do not import another module's internals. Use the module's public barrel (@/modules/<module>) or a domain event. See docs/architecture/module-boundaries.md.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
