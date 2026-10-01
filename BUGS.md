# Bugs

This file records real problems found while building and testing the game. Nothing here is hypothetical.

Status key: **Fixed** = resolved in the code; **Open** = known and not yet resolved.

Bugs 1–4 were found during development testing and fixed before the first commit
(`Add Battleship game with computer opponent, tests and README`), so they do not appear as separate commits in the history.
Bug 5 was found during the recorded browser test, and bugs 6 and 7 were found by an automated code review (Devin Review) of the pull request. Each of these was fixed in a later commit.

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

## 5. Battle log ran off the bottom of smaller laptop screens — Fixed

- **Where:** "Battle log" in the side panel (`styles.css`, `index.html`, `src/app.js`).
- **What happened:** At 1366×768, a common laptop size, the battle log sat below the instructions and key. Once a few shots had been fired, it extended past the bottom of the window. You had to scroll the page to see the log, and if you had scrolled inside the log, the newest entry could be out of view.
- **How it was found:** Recorded browser test at 1366×768, listed here as an open limitation in the first version of this file.
- **Cause:** The side panel grew to fit its contents instead of matching the height of the two boards. The log also had a fixed maximum height (210 pixels) and didn't scroll back to the newest entry.
- **Fix:**
  - On wide screens, the side panel now matches the boards' height, and the battle log fills whatever space is left with its own scroll bar. The whole page fits on a 1366×768 screen without scrolling.
  - On short screens, the instructions use slightly smaller text so more of the log is visible.
  - The log jumps back to the top whenever a new shot is added, so the newest entry is always visible. A "Newest first" label makes the order clear.
- **Verified:** Browser check at 1366×768 after 21 shots: the page doesn't scroll and all three buttons and the status bar are at the top. The log is fully on screen with four entries visible, and the newest one stays visible even after scrolling the log down and firing again. At 1440×900, the page also fits on screen and the newest log entry is visible. In windows narrower than 1240 pixels (checked at 1100×800), the side panel moves below the boards by design, so you scroll the page down to reach the log. All 16 automated tests still pass.

## 6. Ship placement could freeze the game with an unusual random number source — Fixed

- **Where:** Random ship placement (`randomFleetBoard` in `src/game.js`).
- **What happened:** If the random number function kept returning the same value, building a fleet never finished, so the page would freeze. `createGame` and "Randomize my ships" both use this code. The browser's normal random numbers made this practically impossible during play. But the rules are written to accept any random number function (the tests pass in predictable ones), so it was a real defect.
- **How it was found:** Automated code review of the pull request. I confirmed it by running fleet creation with a random number function that always returns 0, 0.5 or 0.999: every run was still stuck after a 5-second limit.
- **Cause:** The code picked a random square and direction, and if the ship didn't fit there it simply tried again, with no limit. With a constant value it picked the same spot every time. With 0, the Carrier went to A1, and the Battleship then tried A1 forever.
- **Fix:** For each ship, the code now lists every position where the ship fits and picks one of those, so each ship is placed on the first try. There is always at least one legal position (the earlier ships cover too few squares to block them all). As a safety net, random numbers outside the expected range (1, negative numbers, or "not a number") are clamped into range so they can't select a position that doesn't exist. That clamping also protects the computer's shot picker.
- **Verified:** New regression test: fleet creation and a full game run in a separate process with a 5-second time limit, using random number functions that always return 0, 0.25, 0.5, 0.999999, 1, -1 and "not a number". Every fleet is checked for legal placement. I also ran the test against the old code: it fails after 5 seconds with "fleet generation did not finish" instead of freezing the test run. All 17 automated tests pass.

## 7. Computer's board didn't fit on phone screens — Fixed

- **Where:** Small-screen layout (`styles.css`).
- **What happened:** On a phone-sized screen (390 pixels wide, like a recent iPhone), the board panels were wider than the screen. The page could be dragged sideways, and the right edge of the computer's board panel was cut off, so reaching the far-right squares meant scrolling sideways first.
- **How it was found:** Automated code review of the pull request. I confirmed it in the browser at 390×844: the page was 404 pixels wide on a 390-pixel screen. While checking, I also found a similar overflow on in-between widths (about 861 to 904 pixels, such as a small tablet or narrow window). There the two boards sat side by side but didn't quite fit.
- **Cause:** Squares were a fixed 30 pixels on small screens. Ten squares plus the row labels, the gaps and the page and panel padding added up to more than 390 pixels. At in-between widths, the switch from side-by-side boards to stacked boards happened at 860 pixels, which was too narrow for two full boards.
- **Fix:**
  - Below 480 pixels wide, the square size now adjusts to the screen width (between 22 and 30 pixels), and the page and panel padding is slightly smaller.
  - The three buttons share the full width, so they wrap neatly.
  - The boards now stack one above the other below 920 pixels instead of 860.
- **Verified:** At 390×844 in a phone-style browser with touch, the page is exactly 390 pixels wide with no sideways scrolling. All 100 squares of the computer's board are fully on screen (about 30 pixels each) and nothing covers them. I played a full game by tapping, through to the end screen, then tapped New game, with no errors. I also checked 320×640 (smallest common phone, squares about 23 pixels), 880×900 and 1024×768: no sideways scrolling at any of them. The 1366×768 laptop layout from bug 5 is unchanged: no page scrolling, and the newest log entry is visible.
