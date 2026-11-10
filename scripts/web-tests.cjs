const { spawn, spawnSync } = require("node:child_process");
(async () => {
  const probe = require("node:net").createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  process.env.POKER_TEST_URL = `http://127.0.0.1:${port}`;
  const server = spawn(
    "python3",
    [
      "-m",
      "http.server",
      String(port),
      "--bind",
      "127.0.0.1",
      "--directory",
      "dist",
    ],
    { stdio: "ignore" },
  );
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      if (server.exitCode !== null)
        throw Error("Web test server exited unexpectedly");
      try {
        const r = await fetch(process.env.POKER_TEST_URL);
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!ready) throw Error("Web test server did not start");
    for (const script of [
      "smoke",
      "curriculum-smoke",
      "trainers-smoke",
      "table-smoke",
      "progress-smoke",
      "release-smoke",
    ]) {
      const r = spawnSync(process.execPath, [`scripts/${script}.cjs`], {
        stdio: "inherit",
      });
      if (r.status !== 0) throw Error(`${script} failed (${r.status})`);
    }
  } finally {
    server.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
