# Battleship

A simple, browser-based Battleship game where you play against a computer opponent.

It is a static web app: plain HTML, CSS and JavaScript with no build step, no server,
no database, no login, no third-party services and no secret keys.

## How to play

1. Your five ships are placed on your board for you. Click **Randomize my ships** to shuffle them.
2. Click **Start game**.
3. Click a square on the **Computer's waters** board to fire. Hits show as a red square with an ✕, misses as a dot.
   After each of your shots the computer fires once at your board.
4. Sink all five enemy ships (lengths 5, 4, 3, 3 and 2) before the computer sinks yours.
5. Click **New game** at any time to start over.

Keyboard players can Tab to the computer's board, move with the arrow keys, and press Enter or Space to fire.

## Running it locally

Download or clone this repository, then open `index.html` in any modern browser (Chrome, Edge, Firefox or Safari).
That's it — nothing to install.

```bash
git clone https://github.com/chloeppak/Battleship-ai.git
cd Battleship-ai
open index.html        # macOS  (Windows: start index.html, Linux: xdg-open index.html)
```

If you prefer to serve it from a local web server, any static server works, for example:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Running the tests

The automated tests cover the core game rules: board size, fleet, ship placement (no overlaps, nothing off the board),
hits and misses, no repeated shots for either side, sinking ships, turn order, winning, losing and resetting.

They use Node.js's built-in test runner, so there are no packages to install. You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm test
```

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | The page: buttons, boards, instructions and status area |
| `styles.css` | Look and layout |
| `src/game.js` | Game rules and the computer opponent, independent of the page |
| `src/app.js` | Draws the boards and connects clicks and key presses to the rules |
| `tests/game.test.js` | Automated tests for the game rules |
| `BUGS.md` | Problems found during development and testing, and how they were fixed |

### How the computer plays

The computer fires at random squares in a checkerboard pattern (every ship covers at least two squares, so this finds
ships with fewer shots). Once it hits a ship, it fires at neighbouring squares until that ship is sunk, then goes back to
searching. It keeps track of every square it has tried and never fires at the same one twice.

## Deploying

Because the game is just static files, it can be hosted for free on any static host. The simplest option is GitHub Pages:

1. In this repository on GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose the `main` branch and the `/ (root)` folder, then click **Save**.
4. After a minute or two the game is live at `https://chloeppak.github.io/Battleship-ai/`.

Other static hosts (Netlify, Cloudflare Pages, Vercel) work the same way: point them at the repository root with no build command.

## Accessibility

- Every button and board square has a text label for screen readers (for example "C4, hit, Cruiser sunk").
- Game messages are announced through a live status region.
- Hits and misses use symbols (✕ and •) as well as colour, so they don't rely on colour alone.
- Text and key colours meet WCAG AA contrast, and keyboard focus is clearly outlined.
