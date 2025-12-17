const { defineConfig } = require("@trigger.dev/sdk");

module.exports = defineConfig({
  project: "EMAIL SCRAPPER",
  dirs: ["./src/trigger"],  // folder with your tasks
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 5000,
      factor: 2,
      randomize: true,
    },
  },
  maxDuration: 3600,
});
