
/* =========================================
   AETHERIA - GAME ENGINE FOUNDATION
   ========================================= */

"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME = {
    width: 960,
    height: 540,
    running: true,
    lastTime: 0,
    deltaTime: 0
};

const COLORS = {
    grass: "#456b43",
    grassDark: "#365b39",
    path: "#a58b62",
    pathDark: "#826d4d",
    water: "#397f9c",
    waterLight: "#65b2c6",
    tree: "#254a32",
    treeLight: "#3d7044",
    stone: "#777d82",
    accent: "#d7b66d"
};

/* Canvas resolution */

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = GAME.width * dpr;
    canvas.height = GAME.height * dpr;

    canvas.style.width = "100%";
    canvas.style.height = "100%";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* Background world */

function drawWorld() {
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // Grass details
    for (let y = 15; y < GAME.height; y += 42) {
        for (let x = 15; x < GAME.width; x += 48) {
            ctx.fillStyle = COLORS.grassDark;
            ctx.fillRect(x, y, 3, 3);
        }
    }

    // Village path
    ctx.fillStyle = COLORS.path;
    ctx.fillRect(0, 350, GAME.width, 85);

    ctx.fillStyle = COLORS.pathDark;
    ctx.fillRect(0, 350, GAME.width, 5);
    ctx.fillRect(0, 430, GAME.width, 5);

    // River
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(700, 0, 110, GAME.height);

    ctx.fillStyle = COLORS.waterLight;
    for (let y = 20; y < GAME.height; y += 55) {
        ctx.fillRect(730, y, 35, 3);
    }

    // Trees
    drawTree(120, 120);
    drawTree(220, 200);
    drawTree(430, 110);
    drawTree(570, 180);
    drawTree(890, 100);
    drawTree(870, 470);
    drawTree(350, 470);
}

function drawTree(x, y) {
    ctx.fillStyle = "#493b2e";
    ctx.fillRect(x - 5, y + 12, 10, 22);

    ctx.fillStyle = COLORS.tree;
    ctx.beginPath();
    ctx.arc(x, y, 23, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.treeLight;
    ctx.beginPath();
    ctx.arc(x - 6, y - 6, 13, 0, Math.PI * 2);
    ctx.fill();
}

/* Loading screen */

function hideLoadingScreen() {
    const loading = document.getElementById("loading-screen");

    if (loading) {
        loading.style.display = "none";
    }
}

/* Rendering */

function render() {
    ctx.clearRect(0, 0, GAME.width, GAME.height);

    drawWorld();
}

/* Main game loop */

function gameLoop(timestamp) {
    if (!GAME.running) return;

    GAME.deltaTime = GAME.lastTime
        ? Math.min((timestamp - GAME.lastTime) / 1000, 0.05)
        : 0;

    GAME.lastTime = timestamp;

    render();

    requestAnimationFrame(gameLoop);
}

/* Initialize */

function initializeGame() {
    hideLoadingScreen();

    requestAnimationFrame(gameLoop);

    console.log("Aetheria game engine initialized.");
}

initializeGame();
