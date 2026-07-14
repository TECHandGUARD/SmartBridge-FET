// eslint.config.js
import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import pluginImport from "eslint-plugin-import";
import pluginA11y from "eslint-plugin-jsx-a11y";
import pluginSecurity from "eslint-plugin-security";

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Files to lint
  FILES: [
    "src/**/*.{js,mjs,cjs,jsx}",
    "!src/lib/**/*",
    "!src/components/ui/**/*",
  ],

  // Files to ignore
  IGNORES: [
    "src/lib/**/*",
    "src/components/ui/**/*",
    "dist/**/*",
    "node_modules/**/*",
    "**/*.test.js",
    "**/*.spec.js",
  ],

  // Allowed unknown properties (shadcn/ui)
  ALLOWED_UNKNOWN_PROPS: [
    "cmdk-input-wrapper",
    "toast-close",
    "data-state",
    "data-value",
    "data-orientation",
  ],
};

// ============================================================
// Main ESLint Config
// ============================================================

export default [
  // ============================================================
  // IGNORE PATTERNS
  // ============================================================
  {
    ignores: CONFIG.IGNORES,
  },

  // ============================================================
  // MAIN CONFIG
  // ============================================================
  {
    files: CONFIG.FILES,

    // ---- Language Options ----
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    // ---- Settings ----
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        alias: {
          map: [["@", "./src"]],
          extensions: [".js", ".jsx", ".json"],
        },
      },
    },

    // ---- Plugins ----
    plugins: {
      // JavaScript
      js: pluginJs,

      // React
      react: pluginReact,

      // React Hooks
      "react-hooks": pluginReactHooks,

      // Unused imports
      "unused-imports": pluginUnusedImports,

      // Import sorting
      import: pluginImport,

      // Accessibility
      "jsx-a11y": pluginA11y,

      // Security
      security: pluginSecurity,
    },

    // ---- Rules ----
    rules: {
      // ============================================================
      // BASE RULES
      // ============================================================
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "warn",
      "no-unused-vars": "off",
      "no-undef": "error",

      // ============================================================
      // UNUSED IMPORTS
      // ============================================================
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // ============================================================
      // REACT RULES
      // ============================================================
      "react/react-in-jsx-scope": "off", // ✅ Vite handles imports
      "react/prop-types": "off", // ✅ Not using PropTypes
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "react/jsx-no-bind": ["warn", { allowArrowFunctions: true }],
      "react/self-closing-comp": "warn",
      "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],
      "react/jsx-pascal-case": "warn",
      "react/jsx-key": ["error", { checkFragmentShorthand: true }],
      "react/jsx-no-target-blank": ["error", { allowReferrer: true }],
      "react/no-array-index-key": "warn",
      "react/no-danger": "error",
      "react/no-unstable-nested-components": "warn",

      // ============================================================
      // REACT HOOKS RULES
      // ============================================================
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": [
        "warn",
        {
          additionalHooks: "(useCallback|useMemo|useEffect)",
        },
      ],

      // ============================================================
      // IMPORT RULES
      // ============================================================
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import/no-duplicates": "warn",
      "import/no-cycle": ["warn", { maxDepth: 10 }],
      "import/no-unresolved": "off", // ✅ Handled by Vite

      // ============================================================
      // ACCESSIBILITY (jsx-a11y)
      // ============================================================
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-has-content": "warn",
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/heading-has-content": "warn",
      "jsx-a11y/html-has-lang": "warn",
      "jsx-a11y/iframe-has-title": "warn",
      "jsx-a11y/img-redundant-alt": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/media-has-caption": "warn",
      "jsx-a11y/no-access-key": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-distracting-elements": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/no-redundant-roles": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
      "jsx-a11y/scope": "warn",
      "jsx-a11y/tabindex-no-positive": "warn",

      // ============================================================
      // SECURITY
      // ============================================================
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-unsafe-regex": "warn",
      "security/detect-object-injection": "off", // Too noisy

      // ============================================================
      // REACT UNKNOWN PROPERTIES (shadcn/ui)
      // ============================================================
      "react/no-unknown-property": [
        "error",
        {
          ignore: CONFIG.ALLOWED_UNKNOWN_PROPS,
        },
      ],
    },
  },
];
