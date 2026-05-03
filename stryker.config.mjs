/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  mutate: ["src/utils/defineSketch.ts"],
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: {
    configFile: undefined
  },
  reporters: ["clear-text"],
  concurrency: 1
};

export default config;
