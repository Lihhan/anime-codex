export async function selectSettingsTab(page, tab = "character") {
  if (!(await page.getByTestId("settings-close").isVisible())) return;
  await page.getByTestId("settings-tab-" + tab).click();
  if (tab === "character") {
    const details = page.locator("details.existing-characters");
    if ((await details.getAttribute("open")) === null)
      await details.locator("summary").click();
  }
}
export async function toggleSettings(page) {
  if (await page.getByTestId("settings-close").isVisible())
    await page.getByTestId("settings-close").click();
  else await page.getByTestId("settings-toggle").click();
}
