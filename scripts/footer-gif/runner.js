import { drawDino, dinoColors } from "./dino.js";

// A pixel runner in the spirit of the browser's offline game, starring the Lume dino.
// The canvas is drawn at art-pixel size and scaled up with `image-rendering: pixelated`.
let HEIGHT = 64;
let GROUND = 52;
const DINO_X = 28;
const FEET = 27;

const digits = {
  0: ["111", "101", "101", "101", "111"], 1: ["010", "110", "010", "010", "111"], 2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"], 4: ["101", "101", "111", "001", "001"], 5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"], 7: ["111", "001", "010", "010", "010"], 8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"], H: ["101", "101", "111", "101", "101"], I: ["111", "010", "010", "010", "111"],
};
function drawText(context, text, x, y) {
  for (const char of text) {
    if (char === " ") { x += 4; continue; }
    digits[char]?.forEach((row, dy) => [...row].forEach((cell, dx) => { if (cell === "1") context.fillRect(x + dx, y + dy, 1, 1); }));
    x += 4;
  }
}

// Obstacles as pixel rectangles [x, y, w, h], relative to the ground.
const cacti = [
  { w: 7, h: 15, rects: [[2, 0, 3, 15], [0, 4, 2, 5], [0, 8, 3, 1], [5, 2, 2, 6], [4, 7, 2, 1]] },
  { w: 9, h: 20, rects: [[3, 0, 3, 20], [0, 6, 3, 7], [0, 12, 4, 1], [6, 3, 3, 8], [5, 10, 3, 1]] },
  { w: 17, h: 15, rects: [[2, 0, 3, 15], [0, 4, 2, 5], [0, 8, 3, 1], [5, 2, 2, 6], [4, 7, 2, 1], [10, 3, 3, 12], [8, 7, 2, 4], [8, 10, 3, 1], [13, 5, 2, 5], [12, 9, 2, 1]] },
];
const cloud = [[2, 0, 8, 1], [0, 1, 14, 1], [1, 2, 16, 1], [4, 3, 10, 1]];

export function createRunner(canvas, host, { pixel = 3 } = {}) {
  const context = canvas.getContext("2d", { alpha: true });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0, running = false, destroyed = false, frame = 0, last = 0;
  let scroll = 0, speed = 96, distance = 0, tick = 0, record = Number(localStorage.getItem("lume-runner-hi") || 0);
  const dino = { y: GROUND - FEET, vy: 0, jumping: false };
  let obstacles = [], clouds = [], pebbles = [], stars = [];
  let gap = 0;

  function seed() {
    obstacles = []; clouds = []; pebbles = []; stars = [];
    for (let i = 0; i < 4; i++) clouds.push({ x: Math.random() * width, y: 6 + Math.random() * HEIGHT * .3, s: 1 });
    for (let x = 0; x < width; x += 6 + Math.random() * 18) pebbles.push({ x, y: GROUND + 3 + Math.floor(Math.random() * 4), w: 1 + Math.floor(Math.random() * 3) });
    for (let i = 0; i < 18; i++) stars.push({ x: Math.random() * width, y: 3 + Math.random() * (GROUND - 24), phase: Math.random() * 6 });
    gap = width * .9;
  }

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    const next = Math.max(160, Math.ceil(box.width / pixel));
    const nextHeight = Math.max(60, Math.ceil(box.height / pixel));
    if (next === width && nextHeight === HEIGHT) return;
    width = next;
    HEIGHT = nextHeight;
    // The ground sits above the footer's bottom bar.
    GROUND = HEIGHT - Math.ceil(46 / pixel);
    dino.y = GROUND - FEET;
    canvas.width = width;
    canvas.height = HEIGHT;
    seed();
    draw();
  }

  function jump() { if (!dino.jumping) { dino.jumping = true; dino.vy = -268; } }

  function update(dt) {
    scroll += speed * dt;
    distance += speed * dt;
    speed = Math.min(190, speed + dt * 2.4);
    // Obstacles scroll with the ground; a new one appears when the previous has moved far enough left.
    for (const obstacle of obstacles) obstacle.x -= speed * dt;
    obstacles = obstacles.filter((obstacle) => obstacle.x > -30);
    gap -= speed * dt;
    if (gap <= 0) {
      const kind = Math.random() < .5 ? 0 : Math.random() < .55 ? 1 : 2;
      obstacles.push({ x: width + 10, kind });
      gap = 130 + Math.random() * 150 + speed * .5;
    }
    for (const item of clouds) { item.x -= speed * dt * .22; if (item.x < -20) { item.x = width + 20 + Math.random() * 60; item.y = 6 + Math.random() * HEIGHT * .3; } }
    for (const item of pebbles) { item.x -= speed * dt; if (item.x < -4) { item.x = width + Math.random() * 20; item.y = GROUND + 3 + Math.floor(Math.random() * 4); } }
    for (const item of stars) { item.x -= speed * dt * .04; if (item.x < 0) item.x = width; }
    // The dino jumps when the next cactus is a beat away from it.
    const next = obstacles.find((obstacle) => obstacle.x + cacti[obstacle.kind].w > DINO_X);
    if (next && !dino.jumping) {
      const center = next.x + cacti[next.kind].w / 2 - (DINO_X + 16);
      if (center <= speed * .3 && center > 0) jump();
    }
    if (dino.jumping) {
      dino.vy += 900 * dt;
      dino.y += dino.vy * dt;
      if (dino.y >= GROUND - FEET) { dino.y = GROUND - FEET; dino.vy = 0; dino.jumping = false; }
    }
    tick += dt * (speed / 12);
  }

  function draw() {
    context.clearRect(0, 0, width, HEIGHT);
    context.fillStyle = "#cfe0b8";
    // Moon
    const moon = Math.round(width * .14);
    context.fillRect(moon, 9, 6, 6); context.fillStyle = "#101d17"; context.fillRect(moon + 2, 9, 4, 5);
    context.fillStyle = "#cfe0b8"; context.fillRect(moon, 9, 3, 6);
    for (const star of stars) { context.fillStyle = Math.sin(star.phase + performance.now() / 700) > .1 ? "#4a6b53" : "#2c4636"; context.fillRect(Math.round(star.x), Math.round(star.y), 1, 1); }
    context.fillStyle = "#1d3527";
    for (const item of clouds) for (const [x, y, w, h] of cloud) context.fillRect(Math.round(item.x + x), Math.round(item.y + y), w, h);
    // Ground
    context.fillStyle = "#47694f";
    context.fillRect(0, GROUND, width, 1);
    context.fillStyle = "#2e4b38";
    for (const item of pebbles) context.fillRect(Math.round(item.x), item.y, item.w, 1);
    // Obstacles
    context.fillStyle = "#6f9b78";
    for (const obstacle of obstacles) {
      const sprite = cacti[obstacle.kind];
      for (const [x, y, w, h] of sprite.rects) context.fillRect(Math.round(obstacle.x + x), GROUND - sprite.h + y, w, h);
    }
    // Dino
    const running = !dino.jumping && !reduced.matches;
    drawDino(context, DINO_X, dino.y, { frame: Math.floor(tick) % 2, jump: dino.jumping, shade: reduced.matches ? dinoColors.idle : dinoColors.running, dust: running });
    // Score
    context.fillStyle = "#6f9b78";
    const score = String(Math.floor(distance / 10)).padStart(5, "0");
    const hi = String(Math.floor(record)).padStart(5, "0");
    drawText(context, "HI " + hi + " " + score, width - 4 - 14 * 4 - 8, 4);
  }

  function loop(time) {
    frame = 0;
    if (destroyed || !running) return;
    const dt = Math.min(.05, (time - last) / 1000 || 0);
    last = time;
    update(dt);
    if (Math.floor(distance / 10) > record) { record = Math.floor(distance / 10); }
    draw();
    frame = requestAnimationFrame(loop);
  }
  function start() { if (running || reduced.matches || destroyed) return; running = true; last = performance.now(); frame = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(frame); frame = 0; try { localStorage.setItem("lume-runner-hi", String(Math.floor(record))); } catch { /* optional */ } }

  let visible = false;
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else stop(); }, { threshold: .05 });
  observer.observe(host);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else if (visible) start(); });
  canvas.addEventListener("pointerdown", jump);
  resize();
  draw();
  return { jump, dispose() { destroyed = true; stop(); observer.disconnect(); resizeObserver.disconnect(); } };
}
