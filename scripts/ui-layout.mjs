// Existing full-transcript checks deliberately exercise the retained chat view.
export async function useChatLayout(page) {
  await page.getByTestId("character-images").waitFor();
  if (await page.getByTestId("gal-dialogue").count())
    await page.getByTestId("dialogue-mode").click();
  await page.getByTestId("message-input").waitFor();
}
