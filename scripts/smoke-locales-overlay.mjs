import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createTranslator } from "../shared/i18n.mjs";
await fs.mkdir("test-results", { recursive: true });
const directory = await fs.mkdtemp(
  path.resolve("test-results/locales-overlay-"),
);
const options = {
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_SURFACE: "",
    ANIME_CODEX_DATA_DIR: directory,
  },
};
let app = await electron.launch(options);
const errors = [],
  tested = [];
try {
  let page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("pet-body").waitFor();
  if (await page.getByRole("button", { name: "稍后再认识" }).count())
    await page.getByRole("button", { name: "稍后再认识" }).click();
  const anchor = await page.locator(".pet-world").boundingBox();
  await page.getByTestId("pet-body").hover();
  await page.getByTitle("设置", { exact: true }).click();
  await page
    .getByRole("button", { name: "角色、模型与更多设置 ↗", exact: true })
    .click();
  for (const language of ["en", "ja", "zh"]) {
    await page.getByTestId("companion-language").selectOption(language);
    await page.waitForFunction(
      (language) =>
        document.documentElement.lang ===
        { zh: "zh-CN", en: "en", ja: "ja" }[language],
      language,
    );
    const t = createTranslator(language);
    const menuLabels = await app.evaluate(({ Menu }) =>
      Menu.getApplicationMenu().items.map((item) => item.label),
    );
    assert.ok(menuLabels.includes(t("Edit")));
    assert.ok(menuLabels.includes(t("Window")));
    await page
      .getByRole("heading", { name: t("我的角色"), exact: true })
      .waitFor();
    await page
      .getByRole("heading", { name: t("自己的动作语音包"), exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByLabel(t("Keep character on top"), { exact: true })
        .isChecked(),
      true,
    );
    assert.equal(
      await page
        .getByLabel(t("Keep position (dragging is still allowed)"), {
          exact: true,
        })
        .isChecked(),
      true,
    );
    for (const tab of ["任务", "记忆", "生活", "设置"]) {
      await page
        .locator(".companion-tabs")
        .getByRole("button", { name: t(tab), exact: true })
        .click();
      const current = await page.locator(".pet-world").boundingBox();
      assert.equal(current.x, anchor.x);
      assert.equal(current.y, anchor.y);
      if (language === "en") {
        const untranslated = await page
          .getByTestId("companion-panel")
          .evaluate((panel) => {
            const walker = document.createTreeWalker(
                panel,
                NodeFilter.SHOW_TEXT,
              ),
              found = [];
            while (walker.nextNode()) {
              const n = walker.currentNode,
                p = n.parentElement;
              if (
                p.closest(
                  "option,textarea,input,pre,code,.message-text,.profile-preview",
                ) ||
                !p.getClientRects().length
              )
                continue;
              if (/[\u3400-\u9fff]/u.test(n.textContent))
                found.push(n.textContent.trim());
            }
            return found;
          });
        assert.deepEqual(
          untranslated,
          [],
          "Untranslated English panel: " + tab,
        );
      }
    }
    await page.screenshot({
      path: "test-results/companion-locale-" + language + ".png",
    });
    tested.push(language);
  }
  // Native focus and ignore flags are observed through real BrowserWindow APIs.
  // Cursor positions are fixtures; this does not claim physical OS mouse injection.
  await page.getByLabel("切换到其他窗口时收起面板", { exact: true }).uncheck();
  await page.waitForFunction(
    async () =>
      (await window.animeCodex.companionState()).settings.collapseOnBlur ===
      false,
  );
  await app.evaluate(async ({ BrowserWindow, screen }) => {
    const main = BrowserWindow.getAllWindows()[0],
      bounds = main.getBounds();
    const originalIgnore = main.setIgnoreMouseEvents.bind(main);
    globalThis.overlayProbe = { main, bounds, ignored: null };
    main.setIgnoreMouseEvents = (flag, options) => {
      globalThis.overlayProbe.ignored = flag;
      originalIgnore(flag, options);
    };
    screen.getCursorScreenPoint = () => ({ x: bounds.x + 1, y: bounds.y + 1 });
    const other = new BrowserWindow({
      width: 350,
      height: 200,
      show: true,
      title: "Overlay focus fixture",
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    globalThis.overlayProbe.other = other;
    await other.loadURL("data:text/html,<button>Other window</button>");
    other.focus();
  });
  await page.waitForFunction(
    () => document.documentElement.dataset.pointerPassthrough === "true",
  );
  await page.waitForTimeout(400);
  const native = await app.evaluate(() => ({
    topmost: globalThis.overlayProbe.main.isAlwaysOnTop(),
    focusedOther: globalThis.overlayProbe.other.isFocused(),
    bounds: globalThis.overlayProbe.main.getBounds(),
    previousBounds: globalThis.overlayProbe.bounds,
    ignoringTransparentArea: globalThis.overlayProbe.ignored,
  }));
  assert.equal(native.topmost, true);
  assert.equal(native.focusedOther, true);
  assert.equal(native.ignoringTransparentArea, true);
  assert.deepEqual(native.bounds, native.previousBounds);
  assert.equal(await page.getByTestId("companion-panel").count(), 1);
  await app.evaluate(() => globalThis.overlayProbe.main.focus());
  await page.getByLabel("切换到其他窗口时收起面板", { exact: true }).check();
  await page.waitForFunction(
    async () =>
      (await window.animeCodex.companionState()).settings.collapseOnBlur ===
      true,
  );
  // Hold a native-dialog API promise while a real second window takes focus.
  // This verifies the guard without opening or automating a system file picker.
  await app.evaluate(({ dialog }) => {
    globalThis.overlayProbe.originalPicker = dialog.showOpenDialog;
    dialog.showOpenDialog = () =>
      new Promise((resolve) => {
        globalThis.overlayProbe.resolvePicker = resolve;
      });
  });
  await page.evaluate(() => {
    window.pickerProbe = window.animeCodex
      .bootstrap()
      .then((b) =>
        window.animeCodex.chooseVoiceClip({
          id: b.character.id,
          action: "touch",
        }),
      );
  });
  for (let n = 0; n < 30; n++) {
    if (await app.evaluate(() => !!globalThis.overlayProbe.resolvePicker))
      break;
    await page.waitForTimeout(20);
  }
  assert.equal(
    await app.evaluate(() => !!globalThis.overlayProbe.resolvePicker),
    true,
  );
  await app.evaluate(() => globalThis.overlayProbe.other.focus());
  await page.waitForTimeout(250);
  assert.equal(await page.getByTestId("companion-panel").count(), 1);
  await app.evaluate(({ dialog }) => {
    globalThis.overlayProbe.main.focus();
    globalThis.overlayProbe.resolvePicker({ canceled: true, filePaths: [] });
    dialog.showOpenDialog = globalThis.overlayProbe.originalPicker;
  });
  await page.evaluate(() => window.pickerProbe);
  await page.waitForTimeout(150);
  assert.equal(await page.getByTestId("companion-panel").count(), 1);
  await app.evaluate(() => globalThis.overlayProbe.other.focus());
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="companion-panel"]'),
  );
  await app.evaluate(() => {
    globalThis.overlayProbe.other.destroy();
    globalThis.overlayProbe.main.focus();
  });
  const bodyBox = await page.getByTestId("pet-body").boundingBox();
  await app.evaluate(({ screen }, rect) => {
    const b = globalThis.overlayProbe.main.getBounds();
    screen.getCursorScreenPoint = () => ({
      x: b.x + rect.x + rect.width / 2,
      y: b.y + rect.y + rect.height / 2,
    });
  }, bodyBox);
  await page.getByTestId("pet-body").hover();
  await page.getByTitle("设置", { exact: true }).click();
  await page
    .getByRole("button", { name: "角色、模型与更多设置 ↗", exact: true })
    .click();
  await page.getByTestId("companion-language").selectOption("ja");
  await page
    .getByRole("heading", {
      name: createTranslator("ja")("我的角色"),
      exact: true,
    })
    .waitFor();
  await page
    .getByLabel(createTranslator("ja")("Keep character on top"), {
      exact: true,
    })
    .uncheck();
  await page.waitForFunction(
    async () =>
      (await window.animeCodex.bootstrap()).desktop.alwaysOnTop === false,
  );
  assert.equal(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].isAlwaysOnTop(),
    ),
    false,
  );
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await page.getByTestId("pet-body").waitFor();
  const boot = await page.evaluate(() => window.animeCodex.bootstrap());
  assert.equal(boot.language, "ja");
  assert.equal(boot.desktop.alwaysOnTop, false);
  assert.equal(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].isAlwaysOnTop(),
    ),
    false,
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/locales-overlay.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        platform: process.platform,
        languages: tested,
        persistence: true,
        fixedPositionAcrossPanels: true,
        nativeTopmost: true,
        pinTogglePersists: true,
        otherWindowKeepsFocus: true,
        panelsCollapseOnExternalFocus: true,
        manualPanelRetention: true,
        dialogGuardFixture: true,
        nativeMenusLocalized: true,
        transparentAreaIgnoresMouse: true,
        physicalMouseInjection: false,
        modelCalls: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "Three-language companion panels, native topmost/focus, click-through and restart passed.",
  );
} finally {
  await app.close();
}
