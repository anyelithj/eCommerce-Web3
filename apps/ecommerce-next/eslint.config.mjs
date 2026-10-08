import sharedConfig from "@ecommerce/eslint-config";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...sharedConfig,
  nextPlugin.flatConfig.coreWebVitals,
  reactHooks.configs["recommended-latest"],
];
