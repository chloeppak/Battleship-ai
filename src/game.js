/*
 * Battleship game rules.
 *
 * This file has no knowledge of the web page. It holds the boards, ships,
 * shots, turn order and computer opponent, so the rules can be tested on
 * their own. It works both in the browser (as window.Battleship) and in
 * Node.js (via require) for the automated tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.Battleship = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOARD_SIZE = 10;

  const FLEET = Object.freeze([
    Object.freeze({ name: 'Carrier', length: 5 }),
    Object.freeze({ name: 'Battleship', length: 4 }),
    Object.freeze({ name: 'Cruiser', length: 3 }),
    Object.freeze({ name: 'Submarine', length: 3 }),
    Object.freeze({ name: 'Destroyer', length: 2 }),
  ]);

  const COLUMN_LETTERS = 'ABCDEFGHIJ';

  function coordinateName(row, col) {
    return COLUMN_LETTERS[col] + (row + 1);
  }

  function isOnBoard(row, col) {
    return (
      Number.isInteger(row) &&
      Number.isInteger(col) &&
      row >= 0 &&
      row < BOARD_SIZE &&
      col >= 0 &&
      col < BOARD_SIZE
    );
  }

  function createBoard() {
    const shots = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      shots.push(new Array(BOARD_SIZE).fill(null));
    }
    return { ships: [], shots: shots };
  }

  function shipCells(length, row, col, horizontal) {
    const cells = [];
    for (let i = 0; i < length; i++) {
      cells.push(horizontal ? [row, col + i] : [row + i, col]);
    }
    return cells;
  }

  function shipAt(board, row, col) {
    for (const ship of board.ships) {
      for (const [r, c] of ship.cells) {
        if (r === row && c === col) return ship;
      }
    }
    return null;
  }

  function canPlaceShip(board, length, row, col, horizontal) {
    return shipCells(length, row, col, horizontal).every(
      ([r, c]) => isOnBoard(r, c) && shipAt(board, r, c) === null
    );
  }

  function placeShip(board, shipType, row, col, horizontal) {
    if (!canPlaceShip(board, shipType.length, row, col, horizontal)) {
      throw new Error(
        'Cannot place ' + shipType.name + ' at ' + row + ',' + col +
          ': it would overlap another ship or leave the board.'
      );
    }
    const ship = {
      name: shipType.name,
      length: shipType.length,
      cells: shipCells(shipType.length, row, col, horizontal),
      hits: 0,
    };
    board.ships.push(ship);
    return ship;
  }

  function randomInt(rng, max) {
    return Math.floor(rng() * max);
  }

  function randomFleetBoard(rng) {
    rng = rng || Math.random;
    const board = createBoard();
    for (const shipType of FLEET) {
      let placed = false;
      while (!placed) {
        const horizontal = rng() < 0.5;
        const row = randomInt(rng, BOARD_SIZE);
        const col = randomInt(rng, BOARD_SIZE);
        if (canPlaceShip(board, shipType.length, row, col, horizontal)) {
          placeShip(board, shipType, row, col, horizontal);
          placed = true;
        }
      }
    }
    return board;
  }

  function isSunk(ship) {
    return ship.hits >= ship.length;
  }

  function allShipsSunk(board) {
    return board.ships.length > 0 && board.ships.every(isSunk);
  }

  /*
   * Fires at a board. Returns one of:
   *   { valid: false, reason: 'off-board' | 'already-fired' }
   *   { valid: true, hit: false }
   *   { valid: true, hit: true, ship, sunk }
   */
  function receiveShot(board, row, col) {
    if (!isOnBoard(row, col)) return { valid: false, reason: 'off-board' };
    if (board.shots[row][col] !== null) {
      return { valid: false, reason: 'already-fired' };
    }
    const ship = shipAt(board, row, col);
    if (!ship) {
      board.shots[row][col] = 'miss';
      return { valid: true, hit: false, row: row, col: col };
    }
    board.shots[row][col] = 'hit';
    ship.hits += 1;
    return { valid: true, hit: true, ship: ship, sunk: isSunk(ship), row: row, col: col };
  }

  /*
   * Computer opponent. It hunts at random (on a checkerboard pattern, since
   * every ship is at least 2 long) and, after a hit, targets the squares
   * next to it until that ship is sunk. It never fires at the same square
   * twice.
   */
  function createComputerPlayer(rng) {
    rng = rng || Math.random;
    const known = createBoard().shots; // null | 'miss' | 'hit' | 'sunk'

    function untried(r, c) {
      return isOnBoard(r, c) && known[r][c] === null;
    }

    function targetCandidates() {
      const openHits = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (known[r][c] === 'hit') openHits.push([r, c]);
        }
      }
      if (openHits.length === 0) return [];

      // Prefer continuing a line of two or more adjacent hits.
      const inLine = [];
      for (const [r, c] of openHits) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          if (isOnBoard(r + dr, c + dc) && known[r + dr][c + dc] === 'hit') {
            let br = r - dr, bc = c - dc;
            while (isOnBoard(br, bc) && known[br][bc] === 'hit') { br -= dr; bc -= dc; }
            let fr = r + dr, fc = c + dc;
            while (isOnBoard(fr, fc) && known[fr][fc] === 'hit') { fr += dr; fc += dc; }
            if (untried(br, bc)) inLine.push([br, bc]);
            if (untried(fr, fc)) inLine.push([fr, fc]);
          }
        }
      }
      if (inLine.length > 0) return inLine;

      const adjacent = [];
      for (const [r, c] of openHits) {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (untried(r + dr, c + dc)) adjacent.push([r + dr, c + dc]);
        }
      }
      return adjacent;
    }

    function huntCandidates() {
      const checkerboard = [];
      const any = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (known[r][c] !== null) continue;
          any.push([r, c]);
          if ((r + c) % 2 === 0) checkerboard.push([r, c]);
        }
      }
      return checkerboard.length > 0 ? checkerboard : any;
    }

    function chooseShot() {
      let candidates = targetCandidates();
      if (candidates.length === 0) candidates = huntCandidates();
      if (candidates.length === 0) return null;
      return candidates[randomInt(rng, candidates.length)];
    }

    function recordResult(result) {
      if (!result.valid) return;
      if (!result.hit) {
        known[result.row][result.col] = 'miss';
        return;
      }
      known[result.row][result.col] = 'hit';
      if (result.sunk) {
        for (const [r, c] of result.ship.cells) known[r][c] = 'sunk';
      }
    }

    return { chooseShot: chooseShot, recordResult: recordResult };
  }

  /*
   * A full game. Phases:
   *   'setup'   - player may randomize ships, then start
   *   'playing' - player and computer take turns ('player' then 'computer')
   *   'over'    - someone has won; no more shots allowed
   */
  function createGame(rng) {
    rng = rng || Math.random;
    return {
      rng: rng,
      phase: 'setup',
      turn: 'player',
      winner: null,
      playerBoard: randomFleetBoard(rng),
      computerBoard: randomFleetBoard(rng),
      computer: createComputerPlayer(rng),
      playerShots: 0,
      computerShots: 0,
    };
  }

  function randomizePlayerShips(game) {
    if (game.phase !== 'setup') return false;
    game.playerBoard = randomFleetBoard(game.rng);
    return true;
  }

  function startGame(game) {
    if (game.phase !== 'setup') return false;
    game.phase = 'playing';
    game.turn = 'player';
    return true;
  }

  function playerFire(game, row, col) {
    if (game.phase !== 'playing') return { valid: false, reason: 'not-playing' };
    if (game.turn !== 'player') return { valid: false, reason: 'not-your-turn' };
    const result = receiveShot(game.computerBoard, row, col);
    if (!result.valid) return result;
    game.playerShots += 1;
    if (allShipsSunk(game.computerBoard)) {
      game.phase = 'over';
      game.winner = 'player';
    } else {
      game.turn = 'computer';
    }
    return result;
  }

  function computerFire(game) {
    if (game.phase !== 'playing') return { valid: false, reason: 'not-playing' };
    if (game.turn !== 'computer') return { valid: false, reason: 'not-computer-turn' };
    const target = game.computer.chooseShot();
    const result = receiveShot(game.playerBoard, target[0], target[1]);
    game.computer.recordResult(result);
    game.computerShots += 1;
    if (allShipsSunk(game.playerBoard)) {
      game.phase = 'over';
      game.winner = 'computer';
    } else {
      game.turn = 'player';
    }
    return result;
  }

  return {
    BOARD_SIZE: BOARD_SIZE,
    FLEET: FLEET,
    coordinateName: coordinateName,
    createBoard: createBoard,
    canPlaceShip: canPlaceShip,
    placeShip: placeShip,
    shipAt: shipAt,
    randomFleetBoard: randomFleetBoard,
    receiveShot: receiveShot,
    isSunk: isSunk,
    allShipsSunk: allShipsSunk,
    createComputerPlayer: createComputerPlayer,
    createGame: createGame,
    randomizePlayerShips: randomizePlayerShips,
    startGame: startGame,
    playerFire: playerFire,
    computerFire: computerFire,
  };
});
