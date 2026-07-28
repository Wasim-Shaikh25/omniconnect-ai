import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "**/*.d.ts",
      "scripts/**",
      "test-plan*.md",
      "test-report*.md",
    ],
  },
  ...tseslint.configs.recommended,
  nextPlugin.flatConfig.coreWebVitals,
  {
    name: "omniconnect/import-boundaries",
    rules: {
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
);
