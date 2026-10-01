# Bugs

This file records real problems found while building and testing the game. Nothing here is hypothetical.

Status key: **Fixed** = resolved in the code; **Open** = known and not yet resolved.

All four bugs below were found during development testing and fixed before the first commit
(`Add Battleship game with computer opponent, tests and README`), so they do not appear as separate commits in the history.

---

## 1. Colour key showed blank squares — Fixed

- **Where:** "Key" section in the side panel (`styles.css`).
- **What happened:** The "Your ship", "Hit" and "Sunk ship" samples all showed as plain light-blue squares, so the key did not match the boards.
- **How it was found:** Screenshot of the setup screen during a browser check.
- **Cause:** The general `.swatch` style was defined later in the stylesheet than the ship/hit/sunk colours, so its light-blue background overrode them.
- **Fix:** Added dedicated `.swatch.cell-ship`, `.swatch.cell-hit`, `.swatch.cell-sunk` and `.swatch.cell-miss` rules that take priority.

## 2. "Sunk" label was crossed out — Fixed

- **Where:** Fleet lists under each board (`styles.css`, `src/app.js`).
- **What happened:** When a ship sank, the whole row was struck through, including the red "Sunk" label, which made it harder to read.
- **How it was found:** Screenshot taken mid-game after the computer sank a ship.
- **Cause:** The strike-through was applied to the whole row, and browsers draw it through every piece of text inside, even when a child element tries to turn it off.
- **Fix:** Gave the ship name its own `fleet-name` element and applied the strike-through only to that.

## 3. Your shot's result disappeared from the message bar — Fixed

- **Where:** Status message at the top of the page (`src/app.js`).
- **What happened:** After you fired, the message showed your result (for example "You fired at B2: hit!"), but about half a second later the computer's shot replaced it entirely. If you looked away briefly, you could miss whether your own shot hit.
- **How it was found:** Automated browser check that fired a shot using the keyboard and then read the status message.
- **Cause:** The computer's turn overwrote the message instead of adding to it.
- **Fix:** The message now shows both results together, for example
  "You fired at B2: miss. Computer fired at E3: miss. Your turn."

## 4. Browser console error on every page load — Fixed

- **Where:** `index.html`.
- **What happened:** Each page load logged "Failed to load resource: 404" in the browser's developer console. Players couldn't see it, but it would look careless to a reviewer who opened the console.
- **How it was found:** Automated browser check that records console errors.
- **Cause:** The browser automatically asks for a site icon (`favicon.ico`), and the project didn't have one.
- **Fix:** Added a small `favicon.svg` and linked it from the page.

---

## Known limitations (Open)

- **Battle log needs scrolling on smaller laptop screens.** At 1366×768 the side panel's battle log can extend below the visible area once it fills up; the list scrolls, but the newest entries are always at the top. Noted during the recorded browser test; not changed.
