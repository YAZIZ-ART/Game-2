/* Aetheria — map.js : peta tile acak (0 = lantai, 1 = batu/tembok) */
'use strict';

const GameMap = {
  cols: 40, rows: 28, tiles: [], w: 0, h: 0,

  generate: function () {
    const T = CFG.TILE;
    this.w = this.cols * T; this.h = this.rows * T;
    this.tiles = [];
    for (let y = 0; y < this.rows; y++) {
      const row = [];
      for (let x = 0; x < this.cols; x++) {
        const edge = x === 0 || y === 0 || x === this.cols - 1 || y === this.rows - 1;
        const nearCenter = Math.abs(x - this.cols / 2) < 4 && Math.abs(y - this.rows / 2) < 4;
        row.push(edge || (!nearCenter && Math.random() < 0.07) ? 1 : 0);
      }
      this.tiles.push(row);
    }
  },

  solid: function (tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return true;
    return this.tiles[ty][tx] === 1;
  },

  /* apakah lingkaran/kotak dengan radius r di (x, y) menabrak tile padat */
  blocked: function (x, y, r) {
    const T = CFG.TILE;
    return this.solid(Math.floor((x - r) / T), Math.floor((y - r) / T)) ||
           this.solid(Math.floor((x + r) / T), Math.floor((y - r) / T)) ||
           this.solid(Math.floor((x - r) / T), Math.floor((y + r) / T)) ||
           this.solid(Math.floor((x + r) / T), Math.floor((y + r) / T));
  },

  randomFloor: function (px, py, minDist) {
    const T = CFG.TILE;
    for (let i = 0; i < 80; i++) {
      const x = (1 + Math.floor(Math.random() * (this.cols - 2))) * T + T / 2;
      const y = (1 + Math.floor(Math.random() * (this.rows - 2))) * T + T / 2;
      if (!this.blocked(x, y, 7) && Math.hypot(x - px, y - py) >= minDist) return { x: x, y: y };
    }
    return { x: this.w / 2, y: this.h / 2 };
  },

  draw: function (ctx, cam) {
    const T = CFG.TILE;
    const x0 = Math.max(0, Math.floor(cam.x / T)), y0 = Math.max(0, Math.floor(cam.y / T));
    const x1 = Math.min(this.cols - 1, Math.floor((cam.x + CFG.W) / T)), y1 = Math.min(this.rows - 1, Math.floor((cam.y + CFG.H) / T));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = Math.round(x * T - cam.x), py = Math.round(y * T - cam.y);
        if (this.tiles[y][x] === 1) {
          ctx.fillStyle = '#2a2142'; ctx.fillRect(px, py, T, T);
          ctx.fillStyle = '#3d3162'; ctx.fillRect(px, py, T, 3);
          ctx.fillStyle = '#1a1430'; ctx.fillRect(px, py + T - 2, T, 2);
        } else {
          ctx.fillStyle = (x + y) % 2 ? '#14122b' : '#171533';
          ctx.fillRect(px, py, T, T);
        }
      }
    }
  }
};
