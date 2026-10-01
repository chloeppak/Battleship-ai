const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const B = require('../src/game.js');

// Small repeatable random number generator so test runs are reproducible.
function seededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shipByName(board, name) {
  return board.ships.find((s) => s.name === name);
}

function assertValidFleet(board) {
  assert.equal(board.ships.length, 5);
  assert.deepEqual(
    board.ships.map((s) => s.length).sort((a, b) => b - a),
    [5, 4, 3, 3, 2]
  );
  const seen = new Set();
  for (const ship of board.ships) {
    assert.equal(ship.cells.length, ship.length);
    const rows = new Set(ship.cells.map(([r]) => r));
    const cols = new Set(ship.cells.map(([, c]) => c));
    assert.ok(rows.size === 1 || cols.size === 1, 'ship must be in a straight line');
    for (const [r, c] of ship.cells) {
      assert.ok(r >= 0 && r < 10 && c >= 0 && c < 10, 'ship must be on the board');
      const key = r + ',' + c;
      assert.ok(!seen.has(key), 'ships must not overlap');
      seen.add(key);
    }
  }
}

// Plays a whole game where the player fires at every square in order.
function playToEnd(game) {
  for (let r = 0; r < 10 && game.phase === 'playing'; r++) {
    for (let c = 0; c < 10 && game.phase === 'playing'; c++) {
      const shot = B.playerFire(game, r, c);
      assert.equal(shot.valid, true);
      if (game.phase === 'playing') assert.equal(B.computerFire(game).valid, true);
    }
  }
}

test('the fleet has five ships of lengths 5, 4, 3, 3 and 2 on a 10x10 board', () => {
  assert.equal(B.BOARD_SIZE, 10);
  assert.deepEqual(B.FLEET.map((s) => s.length), [5, 4, 3, 3, 2]);
});

test('ships cannot extend beyond the board', () => {
  const board = B.createBoard();
  const carrier = B.FLEET[0];
  assert.equal(B.canPlaceShip(board, 5, 0, 6, true), false);
  assert.equal(B.canPlaceShip(board, 5, 6, 0, false), false);
  assert.equal(B.canPlaceShip(board, 2, -1, 0, false), false);
  assert.equal(B.canPlaceShip(board, 5, 0, 5, true), true);
  assert.equal(B.canPlaceShip(board, 5, 5, 0, false), true);
  assert.throws(() => B.placeShip(board, carrier, 9, 9, true));
  assert.equal(board.ships.length, 0);
});

test('ships cannot overlap', () => {
  const board = B.createBoard();
  B.placeShip(board, B.FLEET[0], 2, 2, true); // C3..G3
  assert.equal(B.canPlaceShip(board, 4, 0, 4, false), false); // crosses E3
  assert.throws(() => B.placeShip(board, B.FLEET[1], 0, 4, false));
  assert.equal(B.canPlaceShip(board, 4, 3, 4, false), true); // just below
});

test('random placement always produces a complete, legal fleet', () => {
  for (let seed = 1; seed <= 500; seed++) {
    assertValidFleet(B.randomFleetBoard(seededRandom(seed)));
  }
});

test('fleet generation and a full game finish even when the random number function always returns the same value', () => {
  // Runs in a separate process with a time limit: an endless loop would block
  // this test runner forever instead of failing.
  const gamePath = JSON.stringify(path.join(__dirname, '..', 'src', 'game.js'));
  const script = `
    const B = require(${gamePath});
    const results = [];
    for (const value of [0, 0.25, 0.5, 0.999999, 1, -1, NaN]) {
      const rng = () => value;
      const board = B.randomFleetBoard(rng);
      const game = B.createGame(rng);
      B.randomizePlayerShips(game);
      const fleets = [game.playerBoard.ships, game.computerBoard.ships];
      B.startGame(game);
      for (let r = 0; r < 10 && game.phase === 'playing'; r++) {
        for (let c = 0; c < 10 && game.phase === 'playing'; c++) {
          if (!B.playerFire(game, r, c).valid) throw new Error('player shot rejected');
          if (game.phase === 'playing' && !B.computerFire(game).valid) throw new Error('computer shot rejected');
        }
      }
      if (game.phase !== 'over') throw new Error('game did not finish');
      results.push({ ships: board.ships, gameShips: fleets });
    }
    process.stdout.write(JSON.stringify(results));
  `;
  const run = spawnSync(process.execPath, ['-e', script], { timeout: 5000, encoding: 'utf8' });
  assert.notEqual(run.error && run.error.code, 'ETIMEDOUT', 'fleet generation did not finish within 5 seconds');
  assert.equal(run.status, 0, run.stderr);
  for (const result of JSON.parse(run.stdout)) {
    for (const ships of [result.ships, ...result.gameShips]) {
      const board = B.createBoard();
      board.ships = ships;
      assertValidFleet(board);
    }
  }
});

test('shots are recorded as hits or misses and cannot repeat', () => {
  const board = B.createBoard();
  B.placeShip(board, B.FLEET[4], 0, 0, true); // Destroyer A1, B1
  const miss = B.receiveShot(board, 5, 5);
  assert.equal(miss.valid, true);
  assert.equal(miss.hit, false);
  assert.equal(board.shots[5][5], 'miss');

  const hit = B.receiveShot(board, 0, 0);
  assert.equal(hit.valid, true);
  assert.equal(hit.hit, true);
  assert.equal(hit.sunk, false);
  assert.equal(board.shots[0][0], 'hit');

  assert.deepEqual(B.receiveShot(board, 0, 0), { valid: false, reason: 'already-fired' });
  assert.deepEqual(B.receiveShot(board, 5, 5), { valid: false, reason: 'already-fired' });
  assert.deepEqual(B.receiveShot(board, 10, 0), { valid: false, reason: 'off-board' });
  assert.equal(shipByName(board, 'Destroyer').hits, 1);
});

test('a ship is sunk when every square is hit, and the board is lost when all are sunk', () => {
  const board = B.createBoard();
  B.placeShip(board, B.FLEET[4], 0, 0, true);
  B.placeShip(board, B.FLEET[2], 4, 4, false);
  B.receiveShot(board, 0, 0);
  const sinking = B.receiveShot(board, 0, 1);
  assert.equal(sinking.sunk, true);
  assert.equal(sinking.ship.name, 'Destroyer');
  assert.equal(B.allShipsSunk(board), false);
  B.receiveShot(board, 4, 4);
  B.receiveShot(board, 5, 4);
  assert.equal(B.receiveShot(board, 6, 4).sunk, true);
  assert.equal(B.allShipsSunk(board), true);
});

test('the computer never fires at the same square twice', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rng = seededRandom(seed);
    const board = B.randomFleetBoard(rng);
    const ai = B.createComputerPlayer(rng);
    const fired = new Set();
    for (let i = 0; i < 100; i++) {
      const [r, c] = ai.chooseShot();
      const key = r + ',' + c;
      assert.ok(!fired.has(key), 'repeated shot at ' + key);
      fired.add(key);
      const result = B.receiveShot(board, r, c);
      assert.equal(result.valid, true);
      ai.recordResult(result);
    }
    assert.equal(fired.size, 100);
    assert.equal(ai.chooseShot(), null);
  }
});

test('after a hit, the computer fires next to it', () => {
  const board = B.createBoard();
  B.placeShip(board, B.FLEET[0], 5, 5, false);
  const ai = B.createComputerPlayer(seededRandom(7));
  ai.recordResult(B.receiveShot(board, 5, 5));
  const [r, c] = ai.chooseShot();
  assert.equal(Math.abs(r - 5) + Math.abs(c - 5), 1);
});

test('a new game starts in setup with legal fleets for both sides', () => {
  const game = B.createGame(seededRandom(3));
  assert.equal(game.phase, 'setup');
  assert.equal(game.winner, null);
  assertValidFleet(game.playerBoard);
  assertValidFleet(game.computerBoard);
});

test('ships can be randomized only before the game starts', () => {
  const game = B.createGame(seededRandom(4));
  const before = JSON.stringify(game.playerBoard.ships);
  assert.equal(B.randomizePlayerShips(game), true);
  assert.notEqual(JSON.stringify(game.playerBoard.ships), before);
  assertValidFleet(game.playerBoard);
  B.startGame(game);
  const during = JSON.stringify(game.playerBoard.ships);
  assert.equal(B.randomizePlayerShips(game), false);
  assert.equal(JSON.stringify(game.playerBoard.ships), during);
});

test('the player cannot fire before the game starts', () => {
  const game = B.createGame(seededRandom(5));
  assert.equal(B.playerFire(game, 0, 0).valid, false);
  assert.equal(game.computerBoard.shots[0][0], null);
});

test('each valid player shot is followed by exactly one computer shot', () => {
  const game = B.createGame(seededRandom(6));
  B.startGame(game);
  assert.equal(B.computerFire(game).valid, false, 'computer must wait for the player');

  assert.equal(B.playerFire(game, 0, 0).valid, true);
  assert.equal(game.turn, 'computer');
  assert.equal(B.playerFire(game, 0, 1).reason, 'not-your-turn');

  assert.equal(B.computerFire(game).valid, true);
  assert.equal(B.computerFire(game).valid, false, 'computer only gets one shot');
  assert.equal(game.turn, 'player');
  assert.equal(game.playerShots, 1);
  assert.equal(game.computerShots, 1);
});

test('a repeated player shot is rejected and does not give the computer a turn', () => {
  const game = B.createGame(seededRandom(8));
  B.startGame(game);
  B.playerFire(game, 3, 3);
  B.computerFire(game);
  const repeat = B.playerFire(game, 3, 3);
  assert.deepEqual(repeat, { valid: false, reason: 'already-fired' });
  assert.equal(game.turn, 'player');
  assert.equal(game.playerShots, 1);
  assert.equal(game.computerShots, 1);
});

test('sinking every computer ship wins the game and stops all firing', () => {
  const game = B.createGame(seededRandom(9));
  B.startGame(game);
  const targets = game.computerBoard.ships.flatMap((s) => s.cells);
  for (const [r, c] of targets) {
    assert.equal(B.playerFire(game, r, c).valid, true);
    if (game.phase === 'playing') B.computerFire(game);
  }
  assert.equal(game.phase, 'over');
  assert.equal(game.winner, 'player');
  assert.equal(B.computerFire(game).valid, false);
  const free = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((r) =>
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => [r, c])
  ).find(([r, c]) => game.computerBoard.shots[r][c] === null);
  assert.equal(B.playerFire(game, free[0], free[1]).reason, 'not-playing');
});

test('losing all player ships ends the game with the computer as winner', () => {
  let computerWins = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const game = B.createGame(seededRandom(seed));
    B.startGame(game);
    playToEnd(game);
    assert.equal(game.phase, 'over');
    assert.ok(game.winner === 'player' || game.winner === 'computer');
    const loser = game.winner === 'player' ? game.computerBoard : game.playerBoard;
    assert.equal(B.allShipsSunk(loser), true);
    if (game.winner === 'computer') computerWins++;
  }
  assert.ok(computerWins > 0, 'the computer should win some games against a naive player');
});

test('creating a new game fully resets everything', () => {
  const game = B.createGame(seededRandom(10));
  B.startGame(game);
  playToEnd(game);
  const fresh = B.createGame(seededRandom(11));
  assert.equal(fresh.phase, 'setup');
  assert.equal(fresh.winner, null);
  assert.equal(fresh.playerShots, 0);
  assert.equal(fresh.computerShots, 0);
  for (const board of [fresh.playerBoard, fresh.computerBoard]) {
    assert.ok(board.shots.every((row) => row.every((cell) => cell === null)));
    assert.ok(board.ships.every((s) => s.hits === 0));
  }
});
