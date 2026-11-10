const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const options = {
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
};
module.exports = { chromium, options };
