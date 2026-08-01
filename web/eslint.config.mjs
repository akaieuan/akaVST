import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Socket's web build, copied in from the other repository. It is minified
    // output and a compiled WebAssembly module — linting it produced eleven
    // hundred warnings about somebody else's generated code and buried the
    // ones about ours.
    "public/socket-test/**",
  ]),
]);

export default eslintConfig;
