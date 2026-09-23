import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  plugins: {
    react,
    "react-hooks": reactHooks,
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "prefer-const": "warn",
    "no-console": "warn",
    "no-debugger": "warn",
    "no-unreachable": "warn",
    "react-hooks/exhaustive-deps": "warn",
    "react-hooks/immutability": "off",
    "react-hooks/purity": "off",
    "react-hooks/set-state-in-effect": "off",
    "react/no-unescaped-entities": "warn",
    "react/display-name": "warn",
    "@next/next/no-img-element": "warn",
    "no-irregular-whitespace": "warn",
    "no-case-declarations": "warn",
  },
}, {
  ignores: ["node_modules/**", ".next/**", ".vercel/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills"]
}];

export default eslintConfig;
