
"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME = {
    width: 960,
    height: 540,
    running: true,
    lastTime: 0,
    time: 0,
    particles: [],
    decorations: []
};

const C = {
    grass: "#385d3c",
    grass2: "#426b43",
    grass3: "#315438",
    grassLight: "#52794b",
    soil: "#8b7351",
    soilLight: "#b39a70",
    water: "#286c91",
    waterLight: "#55a5bd",
    wood: "#755037",
    gold: "#e9ce83"
};

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = GAME.width * dpr;
    canvas.height = GAME.height * dpr;

    canvas.style.width = "100%";
    canvas.style.height = "100%";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Random deterministik untuk dekorasi
let seed = 12345;

function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
}

function drawGrass() {
    ctx.fillStyle = C.grass;
    ctx.fillRect(0, 0, 960, 540);

    for (let i = 0; i < 1500; i++) {
        const x = random() * 960;
        const y = random() * 540;
        const size = random() * 3 + 1;

        ctx.fillStyle = [
            C.grass2,
            C.grass3,
            C.grassLight
        ][Math.floor(random() * 3)];

        ctx.fillRect(x, y, size, size);
    }

    // Rumput kecil
    for (let i = 0; i < 180; i++) {
        const x = random() * 960;
        const y = random() * 540;

        ctx.strokeStyle = "#73935b";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 2, y - 5);
        ctx.stroke();
    }
}

function drawPath() {
    // Jalur utama
    ctx.fillStyle = "#66543e";
    ctx.fillRect(0, 345, 960, 100);

    ctx.fillStyle = C.soil;
    ctx.fillRect(0, 350, 960, 85);

    // Tekstur tanah
    for (let i = 0; i < 180; i++) {
        const x = random() * 960;
        const y = 350 + random() * 85;

        ctx.fillStyle = random() > 0.5
            ? "#c0a77b"
            : "#806b4e";

        ctx.fillRect(x, y, 2 + random() * 5, 2);
    }

    ctx.fillStyle = "#c3a77b";
    ctx.fillRect(0, 350, 960, 3);
    ctx.fillRect(0, 432, 960, 3);
}

function drawRiver() {
    // Tepi sungai
    ctx.fillStyle = "#574f3b";
    ctx.fillRect(690, 0, 130, 540);

    ctx.fillStyle = "#317a96";
    ctx.fillRect(700, 0, 110, 540);

    // Animasi aliran air
    const offset = (GAME.time * 35) % 65;

    for (let y = -65; y < 600; y += 65) {
        const pos = y + offset;

        ctx.fillStyle = "#55a6bd";
        ctx.fillRect(716, pos, 35, 3);
        ctx.fillRect(766, pos + 22, 20, 2);

        ctx.fillStyle = "#397f9e";
        ctx.fillRect(730, pos + 8, 15, 2);
    }

    // Riak air
    for (let i = 0; i < 12; i++) {
        const y = (i * 51 + GAME.time * 22) % 540;

        ctx.strokeStyle = "rgba(180,230,240,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(755, y, 5 + Math.sin(GAME.time + i) * 2, 0, Math.PI);
        ctx.stroke();
    }

    // Jembatan kayu
    ctx.fillStyle = "#493323";
    ctx.fillRect(687, 365, 136, 38);

    ctx.fillStyle = "#a17a4f";
    ctx.fillRect(695, 369, 120, 29);

    for (let x = 699; x < 815; x += 15) {
        ctx.fillStyle = "#67452f";
        ctx.fillRect(x, 369, 3, 29);
    }

    ctx.fillStyle = "#c49a64";
    ctx.fillRect(695, 365, 120, 4);
}

function drawTree(x, y, size = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);

    // Bayangan
    ctx.fillStyle = "rgba(10,20,12,0.28)";
    ctx.beginPath();
    ctx.ellipse(5, 8, 27, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Batang
    ctx.fillStyle = "#60432d";
    ctx.fillRect(-6, -3, 13, 27);

    // Kanopi
    ctx.fillStyle = "#1d422c";
    ctx.beginPath();
    ctx.arc(0, -15, 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2c5b36";
    ctx.beginPath();
    ctx.arc(-7, -22, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#477b43";
    ctx.beginPath();
    ctx.arc(-9, -26, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(135,177,93,0.3)";
    ctx.fillRect(-16, -32, 7, 3);

    ctx.restore();
}

function drawBush(x, y) {
    ctx.fillStyle = "#244b30";
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 4, 10, 0, Math.PI * 2);
    ctx.arc(x + 18, y + 2, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#57804a";
    ctx.fillRect(x - 5, y - 7, 5, 4);
}

function drawFlower(x, y, color) {
    ctx.fillStyle = "#315a37";
    ctx.fillRect(x, y, 2, 8);

    ctx.fillStyle = color;
    ctx.fillRect(x - 3, y - 3, 3, 3);
    ctx.fillRect(x + 2, y - 3, 3, 3);
    ctx.fillRect(x - 1, y - 6, 3, 3);
    ctx.fillRect(x - 1, y, 3, 3);

    ctx.fillStyle = "#f5d77b";
    ctx.fillRect(x, y - 2, 2, 2);
}

function drawRock(x, y, size) {
    ctx.fillStyle = "#343f3b";
    ctx.beginPath();
    ctx.ellipse(x, y + 3, size, size * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#78857b";
    ctx.beginPath();
    ctx.ellipse(x - 2, y, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#a4aa94";
    ctx.fillRect(x - size / 2, y - 3, 4, 2);
}

function createDecorations() {
    seed = 12345;

    for (let i = 0; i < 48; i++) {
        const x = random() * 960;
        const y = random() * 540;

        // Hindari jalur dan jembatan
        if ((y > 340 && y < 450) ||
            (x > 680 && x < 830)) continue;

        const type = random();

        if (type < 0.38) {
            GAME.decorations.push({
                type: "tree",
                x, y,
                size: 0.7 + random() * 0.5
            });
        } else if (type < 0.65) {
            GAME.decorations.push({
                type: "bush",
                x, y
            });
        } else if (type < 0.83) {
            GAME.decorations.push({
                type: "rock",
                x, y,
                size: 4 + random() * 6
            });
        } else {
            GAME.decorations.push({
                type: "flower",
                x, y,
                color: ["#e6d17c", "#e58b9b", "#d9d8ed"][
                    Math.floor(random() * 3)
                ]
            });
        }
    }

    GAME.decorations.sort((a, b) => a.y - b.y);
}

function drawDecorations() {
    for (const item of GAME.decorations) {
        if (item.type === "tree") {
            drawTree(item.x, item.y, item.size);
        } else if (item.type === "bush") {
            drawBush(item.x, item.y);
        } else if (item.type === "rock") {
            drawRock(item.x, item.y, item.size);
        } else if (item.type === "flower") {
            drawFlower(item.x, item.y, item.color);
        }
    }
}

// Partikel lingkungan
function createParticles() {
    for (let i = 0; i < 35; i++) {
        GAME.particles.push({
            x: random() * 960,
            y: random() * 540,
            type: random() > 0.5 ? "leaf" : "firefly",
            size: 1 + random() * 2,
            speed: 8 + random() * 15,
            phase: random() * 6.28
        });
    }
}

function updateParticles(dt) {
    for (const p of GAME.particles) {
        p.phase += dt;

        p.x += Math.sin(p.phase) * dt * 13;
        p.y -= p.speed * dt;

        if (p.y < -10) {
            p.y = 550;
            p.x = random() * 960;
        }
    }
}

function drawParticles() {
    for (const p of GAME.particles) {
        if (p.type === "leaf") {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.sin(p.phase) * 0.8);

            ctx.fillStyle = "#a6bd65";
            ctx.fillRect(-2, -1, 5, 3);

            ctx.restore();
        } else {
            const glow = 0.35 + Math.sin(p.phase * 2) * 0.3;

            ctx.fillStyle = `rgba(255,230,125,${glow})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255,220,100,${glow * 0.15})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawAtmosphere() {
    // Cahaya matahari
    const light = ctx.createRadialGradient(
        260, 80, 20,
        260, 80, 480
    );

    light.addColorStop(0, "rgba(255,232,160,0.10)");
    light.addColorStop(1, "rgba(0,0,0,0.16)");

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, 960, 540);

    // Pinggiran bayangan
    const shade = ctx.createRadialGradient(
        480, 270, 200,
        480, 270, 650
    );

    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.25)");

    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 960, 540);
}

function drawWorld() {
    drawGrass();
    drawRiver();
    drawPath();
    drawDecorations();
    drawParticles();
    drawAtmosphere();
}

function hideLoadingScreen() {
    const loading = document.getElementById("loading-screen");
    if (loading) loading.style.display = "none";
}

function render() {
    ctx.clearRect(0, 0, GAME.width, GAME.height);
    drawWorld();
}

function gameLoop(timestamp) {
    if (!GAME.running) return;

    const dt = GAME.lastTime
        ? Math.min((timestamp - GAME.lastTime) / 1000, 0.05)
        : 0;

    GAME.lastTime = timestamp;
    GAME.time += dt;

    updateParticles(dt);
    render();

    requestAnimationFrame(gameLoop);
}

function initializeGame() {
    createDecorations();
    createParticles();
    hideLoadingScreen();

    requestAnimationFrame(gameLoop);

    console.log("Aetheria visual environment initialized.");
}

initializeGame();
