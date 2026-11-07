# Anime Codex

An AI desktop pet you can talk to, play with, and ask for coding help. Choose one of six built-in characters, bring your own artwork, or make an animated companion from an idea.

**Furina in motion** · Three animations from her chibi appearance in the app.

|                                                 Idle                                                 |                                            Reading                                             |                                         Running                                         |
| :--------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------: |
| <img src="docs/images/furina-chibi-idle.gif" alt="Chibi Furina blinking while standing" width="160"> | <img src="docs/images/furina-chibi-reading.gif" alt="Chibi Furina reading a book" width="160"> | <img src="docs/images/furina-chibi-running.gif" alt="Chibi Furina running" width="160"> |

[Download 0.8.1](https://github.com/Lihhan/anime-codex/releases/tag/v0.8.1) · [Make your own pet](#make-your-own-ai-desktop-pet) · [Meet the characters](#meet-the-built-in-characters)

## Make your own AI desktop pet

Hover over your pet and open **Settings → Characters, models and more settings → New character · Profile and appearance**.

1. **Give your character a name.** Add the title of their work if they come from a story, game, or anime. Leave that field empty for an original character.
2. **Describe how you want them to look and act.** You can specify their personality, outfit, how they speak, and even what they should call you. For example: _A sleepy librarian with silver hair and a teal sweater. Speak gently, make the occasional dry joke, and call me Alex._
3. **Choose what to make.**
   - **Create and activate companion** makes a profile, a consistent appearance, and animations for activities such as standing, listening, reading, eating, sleeping, working, and playing, with poses for changing between activities. Once it finishes, the new pet joins your library and becomes active.
   - **Generate profile and dialogue style** starts with their personality and way of speaking. Choose this if you want to review the profile first and decide on artwork later.
4. **Return when it is ready.** You can close the settings panel while production runs. If interrupted, reopen the saved draft and continue from the work already completed.

Full animation generation needs image generation to be available in your signed-in Codex setup. It uses your account allowance and can take a while. If image generation is unavailable, the app saves your progress and explains why.

**Already have a picture?** In **My characters → Edit persona / Import appearance**, upload an idle image first. Add optional pictures for actions like listening, thinking, working, and reacting to a setback. Missing actions use the idle picture, so one image is enough to get started. You can also try **Remove background** and restore the original if you prefer it.

**Want to add sound?** Under **My action audio pack**, upload and preview your own recordings, then enable playback for the matching actions. Recordings are saved per character. Replies still appear as text in the speech bubble. [Audio guide](docs/ACTION_AUDIO.md)

## Interact with your pet

| Try this                    | What happens                                                                                                                                                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hover, then choose Chat** | Type below the speech bubble. Your pet replies in its own voice. You can chat without opening a project.                                                                                                                                                                                 |
| **Tap the character**       | Try the hair, shoulders, or hands. Taps can trigger a playful line or expression, depending on the character's artwork.                                                                                                                                                                  |
| **Open Life**               | Give your pet something to do: read, rest, play, or take a walk. Try **Catch stars** for a quick game.                                                                                                                                                                                   |
| **Open Life → Open arcade** | Play anime character guessing, memory pairs, or two pixel-art beagle games. Hold and release to hop between platforms, or jump and duck through a runner. The arcade opens in its own window while coding work continues.                                                                |
| **Drag or resize**          | Move your pet by dragging it. Use the quick settings to resize it or switch to mini mode.                                                                                                                                                                                                |
| **Keep it nearby**          | Your pet can stay on top and in the same spot while you use other windows. Transparent areas let clicks through. Panels tuck away when you switch apps and return when you come back. Use full Settings to change this behavior, let your pet follow your cursor, or turn on quiet mode. |

If the app first opens in Chinese, hover over your pet, click the sliders icon, and open the full settings panel. Its first dropdown is the language picker. In full Settings, choose **Language** to switch between **中文 / English / 日本語**. Menus and new replies follow your choice; previous conversations stay in their original language.

## What your pet can do

- **Talk and remember.** Ask questions, brainstorm, or just chat. The **Memory** tab lets you review suggested memories and decide what to keep, edit, or forget. Characters keep separate conversations and memories.
- **Help with a real project.** Open **Tasks → Give me a task**, pick a project folder, and ask for something concrete, such as explaining the project, fixing a bug, or running its tests. Codex or optional Claude Code does the work. You can follow progress, review changes, and answer approval requests. Your pet reports what happened, including failures and checks that did not run.
- **Make tidying a game.** In **Life**, offer a file as a snack. Review the list first: if you confirm, those files move to the Trash or Recycle Bin, and the app keeps a recovery copy.

## Meet the built-in characters

Choose a companion from **Settings → Characters, models and more settings → My characters**.

| Character          | Where they come from           | What they're like                                                                 |
| ------------------ | ------------------------------ | --------------------------------------------------------------------------------- |
| **Rin**            | Original Anime Codex character | Calm, curious, and quietly funny.                                                 |
| **Furina**         | _Genshin Impact_               | Witty and theatrical, with a warm side.                                           |
| **Nahida**         | _Genshin Impact_               | Gentle, observant, and patient when explaining things.                            |
| **Kaguya**         | _Cosmic Princess Kaguya!_      | Playful, energetic, and full of ideas. Wears her everyday outfit with headphones. |
| **Iroha Sakayori** | _Cosmic Princess Kaguya!_      | Practical, kind, and quietly humorous. Appears in her everyday school uniform.    |
| **Elysia**         | _Honkai Impact 3rd_            | Bright, warm, and teasing in a friendly way.                                      |

The franchise characters are unofficial fan interpretations. See [character artwork credits](characters/FANART.md) and [Rin's artwork credits](characters/ASSETS.md).

## Download and get started

Sign in to GitHub with access to the repository, then open the [0.8.1 release](https://github.com/Lihhan/anime-codex/releases/tag/v0.8.1). For AI chat, coding with Codex, and character creation, set up and sign in to [Codex](https://developers.openai.com/codex/cli/) on the same computer. The downloaded Anime Codex app is ready to open without building it yourself.

### Install on Windows

1. Download [Anime-Codex-0.8.1-win-x64.exe](https://github.com/Lihhan/anime-codex/releases/download/v0.8.1/Anime-Codex-0.8.1-win-x64.exe) for Windows 10 or 11 on Intel or AMD x64.
2. If you're updating, quit Anime Codex from its tray icon first.
3. Save the EXE somewhere you can find it again and double-click it. There is no installation wizard.
4. Hover over the pet and choose **Chat** to say hello.

### Install on a Mac

1. Open **Apple menu → About This Mac**. On macOS 14 or later, choose the [Apple Silicon download](https://github.com/Lihhan/anime-codex/releases/download/v0.8.1/Anime-Codex-0.8.1-mac-arm64.dmg) for an M-series chip or the [Intel download](https://github.com/Lihhan/anime-codex/releases/download/v0.8.1/Anime-Codex-0.8.1-mac-x64.dmg) for an Intel processor.
2. If you're updating, quit Anime Codex from its menu-bar icon first.
3. Open the DMG, drag **Anime Codex.app** into **Applications**, and open it from there.
4. Hover over the pet and choose **Chat** to say hello.

If you lose sight of your pet, use the tray or menu-bar icon to bring it back, or press **Ctrl+Alt+A** on Windows / **Command+Option+A** on Mac. See the [release notes](https://github.com/Lihhan/anime-codex/releases/tag/v0.8.1) for first-launch details.

[Character and image guide](docs/CHARACTERS.md) · [Language and desktop settings](docs/LANGUAGES_AND_OVERLAY.md) · [Developer setup](docs/DEVELOPMENT.md) · [Validation](docs/VALIDATION.md)
