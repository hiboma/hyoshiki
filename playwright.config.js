const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:8083",
    viewport: { width: 480, height: 800 },
  },
  webServer: {
    command: "python3 -m http.server 8083 --bind 127.0.0.1",
    port: 8083,
    reuseExistingServer: true,
  },
});
