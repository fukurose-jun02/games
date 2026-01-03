// Game Configuration
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const FPS = 60;

// Physics Constants
const ACCELERATION = 0.8;
const FRICTION = 0.92;
const MAX_SPEED = 12;
const ROAD_LEFT_LIMIT = 120;
const ROAD_RIGHT_LIMIT = CANVAS_WIDTH - 120;

// Obstacle Settings
const OBSTACLE_SPAWN_RATE = 1000; // ms
const OBSTACLE_TYPES = ['🚗', '🚧', '🐄'];
const LANE_WIDTH = (ROAD_RIGHT_LIMIT - ROAD_LEFT_LIMIT) / 3;

// Game State
const state = {
    distance: 1000,
    time: 60,
    sobaCount: 5,
    bikeX: CANVAS_WIDTH / 2,
    bikeVelocity: 0,
    speed: 10, // Road speed (simulated pixel speed per frame)
    lastTime: 0,
    roadOffset: 0,
    sobaPositions: [CANVAS_WIDTH / 2, CANVAS_WIDTH / 2, CANVAS_WIDTH / 2, CANVAS_WIDTH / 2, CANVAS_WIDTH / 2],
    obstacles: [],
    lastSpawnTime: 0,
    isPlaying: false,
    isCrash: false
};

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

// Canvas Setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Input Handling
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        keys[e.code] = true;
    }
    if (e.code === 'Space') {
        if (!state.isPlaying && !state.isCrash) {
            startGame();
        } else if (state.isCrash) {
            recoverSoba();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        keys[e.code] = false;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!state.isPlaying || state.isCrash) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    if (mouseX < state.bikeX - 20) {
        keys.ArrowLeft = true;
        keys.ArrowRight = false;
    } else if (mouseX > state.bikeX + 20) {
        keys.ArrowRight = true;
        keys.ArrowLeft = false;
    } else {
        keys.ArrowLeft = false;
        keys.ArrowRight = false;
    }
});


// Game Loop
function gameLoop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    const deltaTime = timestamp - state.lastTime;
    state.lastTime = timestamp;

    if (state.isPlaying && !state.isCrash) {
        update(deltaTime, timestamp);
    }
    draw();

    requestAnimationFrame(gameLoop);
}

function startGame() {
    state.isPlaying = true;
    state.isCrash = false;
    state.distance = 1000;
    state.time = 60;
    state.sobaCount = 5;
    state.obstacles = [];
    document.getElementById('message-overlay').classList.add('hidden');

    // Reset Timer Loop
    if (window.gameTimer) clearInterval(window.gameTimer);
    window.gameTimer = setInterval(() => {
        if (state.isPlaying && !state.isCrash) {
            state.time--;
            document.getElementById('time').innerText = state.time;
            if (state.time <= 0) {
                gameOver(false); // Time over
            }
        }
    }, 1000);
}

function gameOver(win) {
    state.isPlaying = false;
    state.isCrash = false;
    clearInterval(window.gameTimer);
    const overlay = document.getElementById('message-overlay');
    const title = document.getElementById('message-title');
    const sub = document.getElementById('message-subtitle');
    overlay.classList.remove('hidden');

    if (win) {
        title.innerText = "GOAL!";
        title.style.color = "#00ff00";
        sub.innerText = "Delicious delivery!";
    } else {
        title.innerText = "GAME OVER";
        title.style.color = "#ff0000";
        sub.innerText = state.sobaCount <= 0 ? "You lost all soba!" : "Time's up!";
    }
}

function crash() {
    state.isCrash = true;
    state.sobaCount = 0; // Lost all soba on crash (as per requirement: "scatter soba")
    // Actually requirement says: "scatter soba... mash space to restack".
    // So we set count to 0, and user must mash space to get back to 5?
    // Or maybe just restack one by one?
    // Let's go with: Crash -> Soba = 0. Mash space to increment Soba. When Soba == 5, Go.

    document.getElementById('soba-count').innerText = state.sobaCount;

    // Show recovery message?
    ctx.fillStyle = "red";
    ctx.font = "40px Arial";
    ctx.fillText("CRASH! MASH SPACE!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
}

function recoverSoba() {
    state.sobaCount++;
    if (state.sobaCount > 5) state.sobaCount = 5;
    document.getElementById('soba-count').innerText = state.sobaCount;

    // Reset positions for visual clarity
    state.sobaPositions[state.sobaCount - 1] = state.bikeX;

    if (state.sobaCount === 5) {
        state.isCrash = false; // Resume
        // Clear nearby obstacles to prevent instant re-crash
        state.obstacles = state.obstacles.filter(o => o.y < CANVAS_HEIGHT - 300);
    }
}

function update(deltaTime, timestamp) {
    // Update Distance
    // Speed 10 per frame roughly means 600px per second.
    // Let's say 100px = 1 meter? Or just arbitary units.
    state.distance -= (state.speed * deltaTime / 1000) * 2; // Arbitrary scale
    if (state.distance < 0) state.distance = 0;
    document.getElementById('distance').innerText = Math.floor(state.distance);

    if (state.distance <= 0) {
        gameOver(true);
        return;
    }

    // Road Animation
    state.roadOffset = (state.roadOffset + state.speed) % 100;

    // Bike Physics
    if (keys.ArrowLeft) state.bikeVelocity -= ACCELERATION;
    if (keys.ArrowRight) state.bikeVelocity += ACCELERATION;

    state.bikeVelocity *= FRICTION;

    if (state.bikeVelocity > MAX_SPEED) state.bikeVelocity = MAX_SPEED;
    if (state.bikeVelocity < -MAX_SPEED) state.bikeVelocity = -MAX_SPEED;

    state.bikeX += state.bikeVelocity;

    if (state.bikeX < ROAD_LEFT_LIMIT) {
        state.bikeX = ROAD_LEFT_LIMIT;
        state.bikeVelocity = 0;
    }
    if (state.bikeX > ROAD_RIGHT_LIMIT) {
        state.bikeX = ROAD_RIGHT_LIMIT;
        state.bikeVelocity = 0;
    }

    // Soba Physics
    let targetX = state.bikeX;
    for (let i = 0; i < 5; i++) { // Always update 5 positions, even if not visible
        const lerpFactor = 0.2 - (i * 0.03);
        state.sobaPositions[i] += (targetX - state.sobaPositions[i]) * lerpFactor;
        targetX = state.sobaPositions[i];
    }

    // Obstacle Spawning
    if (timestamp - state.lastSpawnTime > OBSTACLE_SPAWN_RATE) {
        spawnObstacle();
        state.lastSpawnTime = timestamp;
    }

    // Update Obstacles
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
        let obs = state.obstacles[i];
        obs.y += state.speed; // Obstacles move with the road speed

        // Remove if off screen
        if (obs.y > CANVAS_HEIGHT) {
            state.obstacles.splice(i, 1);
            continue;
        }

        // Collision Detection
        // Bike is at (state.bikeX, CANVAS_HEIGHT - 100)
        // Size approx 60px
        const bikeHitbox = { x: state.bikeX - 30, y: CANVAS_HEIGHT - 130, w: 60, h: 60 };
        const obsHitbox = { x: obs.x - 30, y: obs.y - 30, w: 60, h: 60 };

        if (checkCollision(bikeHitbox, obsHitbox)) {
             // If soba count is already 0, game over?
             // Requirement: "Game over if hit with no soba"
             // Wait, logic: "Hit -> Scatter soba -> Stop".
             // "If hit while 0 soba -> Game Over".
             if (state.sobaCount === 0) {
                 gameOver(false);
             } else {
                 crash();
             }
        }
    }
}

function spawnObstacle() {
    const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
    // Randomize X within road limits
    const x = ROAD_LEFT_LIMIT + Math.random() * (ROAD_RIGHT_LIMIT - ROAD_LEFT_LIMIT);

    state.obstacles.push({
        type: type,
        x: x,
        y: -50 // Start above screen
    });
}

function checkCollision(rect1, rect2) {
    return (rect1.x < rect2.x + rect2.w &&
            rect1.x + rect1.w > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.y + rect1.h > rect2.y);
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawRoad();
    drawObstacles();
    if (!state.isCrash || Math.floor(Date.now() / 200) % 2 === 0) { // Blink if crash
        drawBike(state.bikeX, CANVAS_HEIGHT - 100);
    }

    if (state.isCrash) {
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.font = "bold 30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("SPACE連打で復帰！", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
        ctx.strokeText("SPACE連打で復帰！", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
    }
}

function drawObstacles() {
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    for (const obs of state.obstacles) {
        ctx.fillText(obs.type, obs.x, obs.y);
    }
}

function drawRoad() {
    // Asphalt
    ctx.fillStyle = '#555';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // White Lines
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 10;
    ctx.setLineDash([40, 60]);
    ctx.lineDashOffset = -state.roadOffset;

    // Center Line
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();

    // Side Lines
    ctx.setLineDash([]);
    ctx.lineWidth = 20;
    // Left
    ctx.beginPath();
    ctx.moveTo(100, 0);
    ctx.lineTo(100, CANVAS_HEIGHT);
    ctx.stroke();
    // Right
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - 100, 0);
    ctx.lineTo(CANVAS_WIDTH - 100, CANVAS_HEIGHT);
    ctx.stroke();
}

function drawBike(x, y) {
    ctx.textAlign = 'center';
    ctx.font = '60px Arial';
    ctx.fillStyle = '#000'; // Ensure visibility if emoji rendering fails to monochrome
    ctx.fillText('🛵', x, y);

    for (let i = 0; i < state.sobaCount; i++) {
        const sobaX = state.sobaPositions[i];
        const sobaY = y - 50 - (i * 25);
        ctx.fillText('🍜', sobaX, sobaY);
    }
}

// Initial draw
draw();
requestAnimationFrame(gameLoop);
