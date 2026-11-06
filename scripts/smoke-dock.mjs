import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
await fs.mkdir("test-results", { recursive: true });
const app = await electron.launch({
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_SURFACE: "workbench",
    ANIME_CODEX_AUTOCONNECT: "0",
    ANIME_CODEX_DATA_DIR: await fs.mkdtemp(
      path.resolve("test-results/dock-recovery-"),
    ),
  },
});
try {
  const page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  const area = await app.evaluate(({ screen, BrowserWindow }) => {
    globalThis.savedCursor = screen.getCursorScreenPoint;
    globalThis.testCursor = { x: -100000, y: -100000 };
    screen.getCursorScreenPoint = () => globalThis.testCursor;
    const win = BrowserWindow.getAllWindows()[0],
      original = win.setIgnoreMouseEvents.bind(win);
    globalThis.mainWindowId = win.id;
    globalThis.lastIgnore = null;
    win.setIgnoreMouseEvents = (value, options) => {
      globalThis.lastIgnore = value;
      return original(value, options);
    };
    return screen.getPrimaryDisplay().workArea;
  });
  const points = {
    left: { x: area.x, y: area.y + 150 },
    right: { x: area.x + area.width, y: area.y + 150 },
    top: { x: area.x + area.width / 2, y: area.y },
    bottom: { x: area.x + area.width / 2, y: area.y + area.height },
  };
  for (const [edge, point] of Object.entries(points)) {
    await app.evaluate(() => {
      globalThis.testCursor = { x: -100000, y: -100000 };
    });
    const state = await page.evaluate(
      (p) => window.animeCodex.desktopControl({ action: "move", ...p }),
      point,
    );
    console.log("Checking dock edge: " + edge);
    assert.equal(state.edge, edge);
    const tab = page.getByTestId("dock-tab");
    await tab.waitFor();
    assert.ok(await tab.isVisible());
    const box = await tab.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0);
    assert.ok(box.width >= 44 && box.height >= 44);
    let nativeTab;
    for (let i = 0; i < 30; i++) {
      nativeTab = app.windows().find((p) => p.url().endsWith("/dock.html"));
      if (nativeTab) break;
      await page.waitForTimeout(100);
    }
    assert.ok(nativeTab, "a separate native recovery window exists");
    await nativeTab.waitForFunction(
      (edge) => document.body.dataset.edge === edge,
      edge,
    );
    assert.ok(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some(
          (w) => w.getTitle() === "Anime Codex — Edge tab" && w.isVisible(),
        ),
      ),
    );
    assert.equal(
      await nativeTab.evaluate(() => typeof window.animeCodex),
      "undefined",
    );
    assert.equal(
      await page.evaluate(() => {
        const t = document.querySelector(".dock-tab"),
          b = t.getBoundingClientRect();
        return (
          document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2) === t
        );
      }),
      true,
    );
    if (edge === "left") {
      // The dedicated window has only the reveal capability; its click must work.
      await nativeTab.locator("button").click();
    } else {
      // No renderer hover is dispatched. Only native cursor sampling can recover.
      await app.evaluate(({ BrowserWindow }, box) => {
        const bounds = BrowserWindow.fromId(
          globalThis.mainWindowId,
        ).getBounds();
        globalThis.testCursor = {
          x: Math.round(bounds.x + box.x + box.width / 2),
          y: Math.round(bounds.y + box.y + box.height / 2),
        };
      }, box);
    }
    await page.waitForFunction(
      () => !document.querySelector(".dock-tab"),
      null,
      { timeout: 3000 },
    );
    assert.equal(await app.evaluate(() => globalThis.lastIgnore), false);
    assert.ok(await page.getByTestId("character").isVisible());
  }
  await app.evaluate(({ screen }) => {
    screen.getCursorScreenPoint = globalThis.savedCursor;
  });
  await page.evaluate(() =>
    window.animeCodex.desktopControl({ action: "reset" }),
  );
  await fs.writeFile(
    "test-results/dock-recovery.json",
    JSON.stringify(
      {
        fourVisibleInsetTabs: true,
        independentNativeWindow: true,
        nativeTabClick: true,
        nativeHoverWithoutRendererEvents: true,
        inputRestored: true,
        programmingExecuted: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "Dock recovery passed on all four edges without renderer hover events.",
  );
} finally {
  await app.close();
}
