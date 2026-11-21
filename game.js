const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;

let snake = [];
let food = { x: 10, y: 10 };
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;
let score = 0;
let highScore = Number(localStorage.getItem("snakeHighScore")) || 0;
let gameOver = false;
let gameSpeed = 110; // Starting ms per tick
let lastTick = 0;

highScoreEl.textContent = highScore;

// --- Web Audio API Retro Sound Generator ---
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === "eat") {
      // Quick cheerful upward beep
      osc.type = "square";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "gameover") {
      // Retro descending crash buzz
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.3);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    // Ignore audio errors if browser blocks autoplay before user interaction
  }
}

function initGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  dx = 1;
  dy = 0;
  nextDx = 1;
  nextDy = 0;
  score = 0;
  gameSpeed = 110; // Reset speed
  gameOver = false;
  scoreEl.textContent = score;
  spawnFood();
}

function spawnFood() {
  food = {
    x: Math.floor(Math.random() * TILE_COUNT),
    y: Math.floor(Math.random() * TILE_COUNT),
  };
  // Prevent food from spawning on the snake
  if (snake.some((seg) => seg.x === food.x && seg.y === food.y)) {
    spawnFood();
  }
}

function update() {
  if (gameOver) return;

  dx = nextDx;
  dy = nextDy;

  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  // Wall collision
  if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
    endGame();
    return;
  }

  // Self collision
  if (snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
    endGame();
    return;
  }

  snake.unshift(head);

  // Eat food
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    playSound("eat");

    // Speed scaling: decrease interval by 3ms every 50 points (min speed cap at 50ms)
    if (score % 50 === 0 && gameSpeed > 50) {
      gameSpeed -= 6;
    }

    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem("snakeHighScore", highScore);
    }
    spawnFood();
  } else {
    snake.pop();
  }
}

function draw() {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw food
  ctx.fillStyle = "#ff3366";
  ctx.fillRect(food.x * GRID_SIZE + 2, food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);

  // Draw snake
  snake.forEach((seg, index) => {
    ctx.fillStyle = index === 0 ? "#66ff66" : "#22cc22";
    ctx.fillRect(seg.x * GRID_SIZE + 1, seg.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
  });

  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#33ff33";
    ctx.font = "28px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "16px monospace";
    ctx.fillText("Press SPACE to restart", canvas.width / 2, canvas.height / 2 + 20);
  }
}

function endGame() {
  gameOver = true;
  playSound("gameover");
  draw();
}

function gameLoop(timestamp) {
  if (timestamp - lastTick >= gameSpeed) {
    update();
    draw();
    lastTick = timestamp;
  }
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (e) => {
  // Initialize audio context on first key press to satisfy browser autoplay policies
  initAudio();

  if (gameOver && e.code === "Space") {
    initGame();
    return;
  }

  const key = e.key.toLowerCase();
  if ((key === "arrowup" || key === "w") && dy === 0) {
    nextDx = 0;
    nextDy = -1;
  } else if ((key === "arrowdown" || key === "s") && dy === 0) {
    nextDx = 0;
    nextDy = 1;
  } else if ((key === "arrowleft" || key === "a") && dx === 0) {
    nextDx = -1;
    nextDy = 0;
  } else if ((key === "arrowright" || key === "d") && dx === 0) {
    nextDx = 1;
    nextDy = 0;
  }
});

initGame();
requestAnimationFrame(gameLoop);
