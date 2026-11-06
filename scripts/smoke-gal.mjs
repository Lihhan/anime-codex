import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
await fs.mkdir("test-results", { recursive: true });
const directory = await fs.mkdtemp(path.resolve("test-results/gal-profile-"));
const options = {
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_DATA_DIR: directory,
  },
};
let app = await electron.launch(options);
try {
  let page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("gal-dialogue").waitFor();
  await page.getByTestId("language-select").selectOption("en");
  await page.waitForFunction(() => document.documentElement.lang === "en");
  assert.equal(await page.getByTestId("gal-input").count(), 1);
  await page.getByTestId("gal-line").click();
  await page.waitForFunction(() =>
    document
      .querySelector('[data-testid="gal-line"]')
      .textContent.includes("Rin"),
  );
  await page.getByTestId("gal-input").fill("A preserved draft");
  assert.equal(await page.getByTestId("gal-send").isDisabled(), true);
  assert.equal(
    await page.getByTestId("gal-input").inputValue(),
    "A preserved draft",
  );
  assert.equal(await page.locator(".gal-choices").count(), 0);
  assert.equal(
    await page.getByTestId("gal-line").locator("textarea").count(),
    0,
  );
  const response = "Actual streamed fixture. 我保留原始内容 👨‍👩‍👧‍👦。\n\n".repeat(
    18,
  );
  await app.evaluate(({ BrowserWindow }, text) => {
    const w = BrowserWindow.getAllWindows()[0];
    w.webContents.send("codex:event", {
      method: "turn/started",
      params: { turn: { id: "gal-ui-1" } },
    });
    w.webContents.send("codex:event", {
      method: "item/agentMessage/delta",
      params: { turnId: "gal-ui-1", itemId: "gal-agent-1", delta: text },
    });
    w.webContents.send("codex:event", {
      method: "turn/completed",
      params: { turn: { id: "gal-ui-1", status: "completed" } },
    });
  }, response);
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="gal-dialogue"]').dataset.replyId ===
      "gal-agent-1",
  );
  const count = Number(
    await page.getByTestId("gal-dialogue").getAttribute("data-pages"),
  );
  assert.ok(count > 1);
  let joined = "";
  for (let i = 0; i < count; i++) {
    if (
      (await page.getByTestId("gal-line").getAttribute("aria-label")) ===
      "Show full page"
    )
      await page.getByTestId("gal-line").click();
    joined += await page
      .getByTestId("gal-line")
      .locator("span")
      .first()
      .textContent();
    if (i < count - 1) await page.getByTestId("gal-next").click();
  }
  assert.equal(joined, response);
  await page.getByTestId("gal-history").click();
  assert.equal(
    await page.locator(".agentMessage .message-body").textContent(),
    response,
  );
  await page.getByTestId("gal-back").click();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send("codex:event", {
      method: "turn/started",
      params: { turn: { id: "gal-ui-2" } },
    }),
  );
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="gal-dialogue"]').dataset.replyId ===
      "local",
  );
  assert.equal(await page.getByTestId("gal-line").count(), 0);
  assert.equal(await page.getByTestId("gal-input").isDisabled(), true);
  await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    w.webContents.send("codex:event", {
      id: "gal-approval",
      method: "item/commandExecution/requestApproval",
      params: { command: "UI FIXTURE ONLY; no execution", cwd: "fixture" },
    });
  });
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Approve once", exact: true })
      .count(),
    1,
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send("codex:event", {
      method: "turn/completed",
      params: {
        turn: {
          id: "gal-ui-2",
          status: "failed",
          error: { message: "Fixture failure; no command executed" },
        },
      },
    }),
  );
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .locator(".gal-error")
    .getByText("Fixture failure; no command executed")
    .waitFor();
  await page.getByTestId("dialogue-mode").click();
  await page.getByTestId("message-input").waitFor();
  assert.equal(
    await page.getByTestId("message-input").inputValue(),
    "A preserved draft",
  );
  assert.deepEqual(errors, []);
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await page.getByTestId("message-input").waitFor();
  await page.getByTestId("dialogue-mode").click();
  await page.getByTestId("gal-dialogue").waitFor();
  await fs.writeFile(
    "test-results/gal-real-ui.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        persistentInput: true,
        draftPreserved: true,
        exactPagedFixture: true,
        historyOriginal: true,
        noStaleTurn: true,
        approvalPreserved: true,
        layoutPersists: true,
        programmingExecuted: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "Gal UI passed: persistent composer, draft, exact pages/history, turn isolation, approvals, failure and saved layout.",
  );
} finally {
  await app.close();
}
