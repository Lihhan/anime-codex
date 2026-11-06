# Sleep-to-reading transition

The built-in image generator created public/characters/furina/sticker/sleep-read-v1.png using the existing atlas.png as reference, retaining transparency. Four columns/two rows contain eight poses: lying asleep, pushing upright, kneeling and collecting the hat, standing and putting it on, noticing a falling book, catching it with bent knees, opening it, and reading.

The player prioritizes transition_sleep_read; reverse playback puts away the book and returns to sleep. Segments also cover waking, lying down and catching the book. Missing pose artwork is not disguised as movement by crossfading. scripts/smoke-action-transition.mjs records eight live frames and cross-row coordinates, checks opacity remains 1, and exercises reduced motion. These are historical preview checks; current platform evidence is in VALIDATION.md.

## Generation prompt summary

Create a new transparent animation sprite sheet for the exact chibi Furina in the reference. Four columns two rows, 8 square cells. Continuous physical transition: lying asleep with crown beside her; wakes and pushes torso up on palms; kneels and picks up hat; rises and puts hat on; looks up at falling navy gold book; catches it at chest height with knees bending; straightens and opens book; stands reading. Keep consistent character scale, baseline and identity, clear transparent margins, no backgrounds, panel borders, numbers, text, floor shadows or teleporting book.
