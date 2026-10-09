/*
 * Connects the game rules (game.js) to the web page: draws both boards,
 * handles clicks and keyboard input, and shows messages.
 */
(function () {
  'use strict';

  const B = window.Battleship;
  const SIZE = B.BOARD_SIZE;
  const COMPUTER_DELAY_MS = 450;

  const els = {
    status: document.getElementById('status'),
    playerBoard: document.getElementById('player-board'),
    computerBoard: document.getElementById('computer-board'),
    playerFleet: document.getElementById('player-fleet'),
    computerFleet: document.getElementById('computer-fleet'),
    playerShots: document.getElementById('player-shots'),
    computerShots: document.getElementById('computer-shots'),
    log: document.getElementById('log'),
    randomize: document.getElementById('randomize-btn'),
    start: document.getElementById('start-btn'),
    newGame: document.getElementById('new-game-btn'),
  };

  let game;
  let computerTimer = null;
  let lastPlayerMessage = '';
  let focusRow = 0;
  let focusCol = 0;
  const playerCells = [];
  const computerCells = [];

  function buildBoard(container, store, interactive) {
    container.textContent = '';
    store.length = 0;

    const headerRow = document.createElement('div');
    headerRow.className = 'board-row';
    headerRow.setAttribute('role', 'row');
    const corner = document.createElement('div');
    corner.className = 'board-label';
    corner.setAttribute('role', 'columnheader');
    corner.setAttribute('aria-hidden', 'true');
    headerRow.appendChild(corner);
    for (let c = 0; c < SIZE; c++) {
      const label = document.createElement('div');
      label.className = 'board-label';
      label.setAttribute('role', 'columnheader');
      label.textContent = 'ABCDEFGHIJ'[c];
      headerRow.appendChild(label);
    }
    container.appendChild(headerRow);

    for (let r = 0; r < SIZE; r++) {
      const row = document.createElement('div');
      row.className = 'board-row';
      row.setAttribute('role', 'row');
      const rowLabel = document.createElement('div');
      rowLabel.className = 'board-label';
      rowLabel.setAttribute('role', 'rowheader');
      rowLabel.textContent = String(r + 1);
      row.appendChild(rowLabel);

      const cells = [];
      for (let c = 0; c < SIZE; c++) {
        const gridcell = document.createElement('div');
        gridcell.setAttribute('role', 'gridcell');
        gridcell.className = 'cell-wrap';
        let cell;
        if (interactive) {
          cell = document.createElement('button');
          cell.type = 'button';
          cell.tabIndex = -1;
          cell.dataset.row = String(r);
          cell.dataset.col = String(c);
        } else {
          cell = document.createElement('div');
        }
        cell.className = 'cell';
        const mark = document.createElement('span');
        mark.className = 'mark';
        mark.setAttribute('aria-hidden', 'true');
        cell.appendChild(mark);
        gridcell.appendChild(cell);
        row.appendChild(gridcell);
        cells.push(cell);
      }
      store.push(cells);
      container.appendChild(row);
    }
  }

  function describeCell(name, shot, ship, showShips) {
    if (shot === 'hit') {
      return name + ', hit' + (ship && B.isSunk(ship) ? ', ' + ship.name + ' sunk' : '');
    }
    if (shot === 'miss') return name + ', miss';
    if (ship && showShips) return name + ', your ' + ship.name;
    return name + ', not fired at';
  }

  function paintCell(cell, board, r, c, options) {
    const shot = board.shots[r][c];
    const ship = B.shipAt(board, r, c);
    const sunk = shot === 'hit' && ship && B.isSunk(ship);
    const showShip = ship && (options.showShips || (options.revealShips && !shot));

    cell.className = 'cell';
    if (showShip) cell.classList.add(options.showShips ? 'cell-ship' : 'cell-revealed');
    if (shot === 'miss') cell.classList.add('cell-miss');
    if (shot === 'hit') cell.classList.add(sunk ? 'cell-sunk' : 'cell-hit');

    cell.firstChild.textContent = shot === 'hit' ? '\u2715' : shot === 'miss' ? '\u2022' : '';
    let label = describeCell(B.coordinateName(r, c), shot, ship, options.showShips);
    if (!options.showShips && options.revealShips && ship && !shot) {
      label = B.coordinateName(r, c) + ', hidden ' + ship.name + ' (revealed)';
    }
    const labelTarget = cell.tagName === 'BUTTON' ? cell : cell.parentElement;
    labelTarget.setAttribute('aria-label', label);
  }

  function renderFleet(list, board, owner) {
    list.textContent = '';
    for (const ship of board.ships) {
      const item = document.createElement('li');
      const sunk = B.isSunk(ship);
      item.className = 'fleet-item' + (sunk ? ' fleet-sunk' : '');
      const pips = document.createElement('span');
      pips.className = 'pips';
      pips.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < ship.length; i++) {
        const pip = document.createElement('span');
        pip.className = 'pip';
        pips.appendChild(pip);
      }
      const name = document.createElement('span');
      name.className = 'fleet-name';
      name.textContent = ship.name + ' (' + ship.length + ')';
      const state = document.createElement('span');
      state.className = 'fleet-state';
      state.textContent = sunk ? 'Sunk' : 'Afloat';
      item.append(name, pips, state);
      item.setAttribute('aria-label', owner + ' ' + ship.name + ', length ' + ship.length + ', ' + (sunk ? 'sunk' : 'afloat'));
      list.appendChild(item);
    }
  }

  function render() {
    const over = game.phase === 'over';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        paintCell(playerCells[r][c], game.playerBoard, r, c, { showShips: true });
        const cell = computerCells[r][c];
        paintCell(cell, game.computerBoard, r, c, { showShips: false, revealShips: over });
        const canFire = game.phase === 'playing' && game.turn === 'player' && game.computerBoard.shots[r][c] === null;
        cell.disabled = game.phase !== 'playing';
        cell.setAttribute('aria-disabled', canFire ? 'false' : 'true');
        cell.tabIndex = r === focusRow && c === focusCol ? 0 : -1;
      }
    }
    els.computerBoard.classList.toggle('is-waiting', game.phase === 'playing' && game.turn === 'computer');
    els.computerBoard.classList.toggle('is-active', game.phase === 'playing' && game.turn === 'player');

    renderFleet(els.playerFleet, game.playerBoard, 'Your');
    renderFleet(els.computerFleet, game.computerBoard, "Rival crew's");
    els.playerShots.textContent = 'Your shots: ' + game.playerShots;
    els.computerShots.textContent = 'Rival shots: ' + game.computerShots;

    els.randomize.disabled = game.phase !== 'setup';
    els.start.disabled = game.phase !== 'setup';
  }

  function setStatus(message, tone) {
    els.status.textContent = message;
    els.status.className = 'status' + (tone ? ' status-' + tone : '');
  }

  function addLog(message, who) {
    const item = document.createElement('li');
    item.className = 'log-' + who;
    item.textContent = message;
    els.log.prepend(item);
    els.log.scrollTop = 0;
  }

  function describeShot(result, shooter) {
    const where = B.coordinateName(result.row, result.col);
    if (!result.hit) return shooter === 'player' ? 'You fired at ' + where + ': splash, miss.' : 'The rival crew fired at ' + where + ': splash, miss.';
    if (result.sunk) {
      return shooter === 'player'
        ? 'You fired at ' + where + ': hit! You sank the rival\u2019s ' + result.ship.name + '!'
        : 'The rival crew fired at ' + where + ': hit. They sank your ' + result.ship.name + '!';
    }
    return shooter === 'player' ? 'You fired at ' + where + ': hit!' : 'The rival crew fired at ' + where + ': hit on your ' + result.ship.name + '.';
  }

  function announceGameOver() {
    if (game.winner === 'player') {
      setStatus('You win! The Chattahoochee is yours \u2014 you sank the whole rival fleet in ' + game.playerShots + ' shots. Click New game to play again.', 'win');
      addLog('You won the game. ATL is yours.', 'player');
    } else {
      setStatus('You lose. The rival crew sank your whole fleet in ' + game.computerShots + ' shots. Their remaining boats are now shown. Click New game to try again.', 'lose');
      addLog('The rival crew won the game.', 'computer');
    }
  }

  function fireAt(r, c) {
    if (game.phase !== 'playing' || game.turn !== 'player') return;
    const result = B.playerFire(game, r, c);
    if (!result.valid) {
      if (result.reason === 'already-fired') {
        setStatus('You already fired at ' + B.coordinateName(r, c) + '. Choose a different square.', 'warn');
      }
      return;
    }
    const message = describeShot(result, 'player');
    addLog(message, 'player');
    render();

    if (game.phase === 'over') {
      announceGameOver();
      return;
    }
    lastPlayerMessage = message;
    setStatus(message + ' The rival crew is aiming\u2026', result.sunk ? 'good' : null);
    computerTimer = setTimeout(computerTurn, COMPUTER_DELAY_MS);
  }

  function computerTurn() {
    computerTimer = null;
    const result = B.computerFire(game);
    if (!result.valid) return;
    const message = describeShot(result, 'computer');
    addLog(message, 'computer');
    render();
    if (game.phase === 'over') {
      announceGameOver();
      return;
    }
    setStatus(lastPlayerMessage + ' ' + message + ' Your turn.', result.sunk ? 'bad' : null);
  }

  function moveFocus(r, c) {
    focusRow = Math.max(0, Math.min(SIZE - 1, r));
    focusCol = Math.max(0, Math.min(SIZE - 1, c));
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        computerCells[row][col].tabIndex = row === focusRow && col === focusCol ? 0 : -1;
      }
    }
    computerCells[focusRow][focusCol].focus();
  }

  function onBoardClick(event) {
    const cell = event.target.closest('button.cell');
    if (!cell) return;
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    focusRow = r;
    focusCol = c;
    fireAt(r, c);
  }

  function onBoardKeydown(event) {
    const cell = event.target.closest('button.cell');
    if (!cell) return;
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    const moves = {
      ArrowUp: [r - 1, c],
      ArrowDown: [r + 1, c],
      ArrowLeft: [r, c - 1],
      ArrowRight: [r, c + 1],
      Home: [r, 0],
      End: [r, SIZE - 1],
    };
    if (moves[event.key]) {
      event.preventDefault();
      moveFocus(moves[event.key][0], moves[event.key][1]);
    }
  }

  function newGame() {
    if (computerTimer !== null) {
      clearTimeout(computerTimer);
      computerTimer = null;
    }
    game = B.createGame();
    focusRow = 0;
    focusCol = 0;
    els.log.textContent = '';
    render();
    setStatus('Your boats are docked on the Chattahoochee. Click Shuffle my boats to move them, or Start game when you are ready.');
  }

  els.randomize.addEventListener('click', function () {
    if (B.randomizePlayerShips(game)) {
      render();
      setStatus('Your boats have been shuffled. Click Start game when you are ready.');
    }
  });

  els.start.addEventListener('click', function () {
    if (B.startGame(game)) {
      render();
      setStatus('Game on, ATL! Fire by clicking a square on the Rival\u2019s waters board.');
      addLog('The game has started.', 'system');
      moveFocus(focusRow, focusCol);
    }
  });

  els.newGame.addEventListener('click', newGame);
  els.computerBoard.addEventListener('click', onBoardClick);
  els.computerBoard.addEventListener('keydown', onBoardKeydown);

  buildBoard(els.playerBoard, playerCells, false);
  buildBoard(els.computerBoard, computerCells, true);
  newGame();
})();
