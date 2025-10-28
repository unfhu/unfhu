const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const TILE = 32;
const GRID = 13;
const GAME_TIME = 120000; // 2 minutos

const cellTypes = {
  FLOOR: 0,
  WALL: 1,
  CRATE: 2,
  FIRE: 3,
};

const colors = {
  [cellTypes.FLOOR]: "#0f1623",
  [cellTypes.WALL]: "#566178",
  [cellTypes.CRATE]: "#d88935",
  [cellTypes.FIRE]: "#ffdd55",
};

const player = {
  x: 1,
  y: 1,
  alive: true,
  score: 0,
  moveCooldown: 0,
};

let board = [];
let bombs = [];
let explosions = [];
let startTime = Date.now();
let gameOver = false;

function createBoard() {
  board = Array.from({ length: GRID }, (_, y) =>
    Array.from({ length: GRID }, (_, x) => {
      if (
        x === 0 ||
        y === 0 ||
        x === GRID - 1 ||
        y === GRID - 1 ||
        (x % 2 === 0 && y % 2 === 0)
      ) {
        return cellTypes.WALL;
      }

      const safeZone =
        (x <= 2 && y <= 2) ||
        (x >= GRID - 3 && y >= GRID - 3);
      if (safeZone) {
        return cellTypes.FLOOR;
      }

      return Math.random() < 0.45 ? cellTypes.CRATE : cellTypes.FLOOR;
    })
  );
}

function resetGame() {
  createBoard();
  bombs = [];
  explosions = [];
  player.x = 1;
  player.y = 1;
  player.alive = true;
  player.score = 0;
  startTime = Date.now();
  gameOver = false;
  statusEl.textContent = "¡Prepárate!";
}

function drawCell(x, y, type) {
  ctx.fillStyle = colors[type];
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);

  if (type === cellTypes.FIRE) {
    ctx.fillStyle = "rgba(255, 190, 30, 0.5)";
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  }
}

function drawPlayer() {
  ctx.fillStyle = "#6dd3ff";
  ctx.beginPath();
  ctx.arc(
    player.x * TILE + TILE / 2,
    player.y * TILE + TILE / 2,
    TILE / 2.4,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.fillStyle = "#102036";
  ctx.beginPath();
  ctx.arc(
    player.x * TILE + TILE / 2,
    player.y * TILE + TILE / 2.5,
    TILE / 6,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawBomb(bomb) {
  ctx.fillStyle = "#2d3547";
  ctx.beginPath();
  ctx.arc(
    bomb.x * TILE + TILE / 2,
    bomb.y * TILE + TILE / 2,
    TILE / 3,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.fillStyle = "#ff6363";
  ctx.beginPath();
  ctx.arc(
    bomb.x * TILE + TILE / 2,
    bomb.y * TILE + TILE / 2,
    TILE / 6,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function update(delta) {
  if (gameOver) return;

  player.moveCooldown = Math.max(0, player.moveCooldown - delta);

  bombs.forEach((bomb) => {
    bomb.timer -= delta;
  });

  const now = Date.now();
  if (now - startTime >= GAME_TIME) {
    endGame();
  }
}

function endGame() {
  if (!gameOver) {
    gameOver = true;
    statusEl.textContent = `Tiempo finalizado. Puntuación: ${player.score}`;
  }
}

function triggerExplosion(bomb) {
  const blast = [{ x: bomb.x, y: bomb.y }];
  const range = 3;

  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  directions.forEach((dir) => {
    for (let i = 1; i <= range; i += 1) {
      const nx = bomb.x + dir.x * i;
      const ny = bomb.y + dir.y * i;
      if (board[ny][nx] === cellTypes.WALL) break;
      blast.push({ x: nx, y: ny });
      if (board[ny][nx] === cellTypes.CRATE) {
        board[ny][nx] = cellTypes.FLOOR;
        player.score += 10;
        break;
      }
    }
  });

  explosions.push({ tiles: blast, timer: 280 });
}

function handleExplosions(delta) {
  explosions.forEach((explosion) => {
    explosion.timer -= delta;
    explosion.tiles.forEach(({ x, y }) => {
      board[y][x] = cellTypes.FIRE;
      if (player.x === x && player.y === y) {
        player.alive = false;
      }
    });
  });

  explosions = explosions.filter((explosion) => explosion.timer > 0);

  explosions.forEach((explosion) => {
    if (explosion.timer <= 140) {
      explosion.tiles.forEach(({ x, y }) => {
        if (board[y][x] === cellTypes.FIRE) {
          board[y][x] = cellTypes.FLOOR;
        }
      });
    }
  });

  if (!player.alive && !gameOver) {
    gameOver = true;
    statusEl.textContent = `¡Boom! Perdiste con ${player.score} puntos.`;
  }
}

function placeBomb() {
  if (!player.alive || gameOver) return;
  const already = bombs.some((b) => b.x === player.x && b.y === player.y);
  if (already) return;
  bombs.push({ x: player.x, y: player.y, timer: 1800 });
}

function solidTile(x, y) {
  const tile = board?.[y]?.[x];
  return tile === cellTypes.WALL || tile === cellTypes.CRATE;
}

function movePlayer(dx, dy) {
  if (!player.alive || gameOver) return;
  if (player.moveCooldown > 0) return;
  const nx = player.x + dx;
  const ny = player.y + dy;
  if (solidTile(nx, ny)) return;
  if (bombs.some((bomb) => bomb.x === nx && bomb.y === ny)) return;
  player.x = nx;
  player.y = ny;
  player.moveCooldown = 90;
}

const keys = new Set();
window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space") {
    placeBomb();
    event.preventDefault();
  }
  if (event.code === "KeyR") {
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

function processInput() {
  if (keys.has("ArrowUp") || keys.has("KeyW")) movePlayer(0, -1);
  else if (keys.has("ArrowDown") || keys.has("KeyS")) movePlayer(0, 1);
  else if (keys.has("ArrowLeft") || keys.has("KeyA")) movePlayer(-1, 0);
  else if (keys.has("ArrowRight") || keys.has("KeyD")) movePlayer(1, 0);
}

let lastTimestamp = 0;
function loop(timestamp) {
  const delta = Math.min(timestamp - lastTimestamp, 60);
  lastTimestamp = timestamp;

  processInput();
  update(delta);

  bombs = bombs.filter((bomb) => {
    if (bomb.timer <= 0) {
      triggerExplosion(bomb);
      return false;
    }
    return true;
  });

  handleExplosions(delta);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      drawCell(x, y, board[y][x]);
    }
  }

  bombs.forEach(drawBomb);
  if (player.alive) {
    drawPlayer();
  }

  const remaining = Math.max(0, GAME_TIME - (Date.now() - startTime));
  const seconds = Math.ceil(remaining / 1000);
  statusEl.textContent = `Tiempo: ${seconds}s | Puntos: ${player.score}`;

  requestAnimationFrame(loop);
}

resetGame();
requestAnimationFrame(loop);
