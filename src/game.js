const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const hud = document.querySelector('#hud');

const WORLD = {
  gravity: 1800,
  levelWidth: 2800,
  floorY: 500,
};

class Input {
  constructor() {
    this.pressed = new Set();
    addEventListener('keydown', (e) => this.pressed.add(e.key.toLowerCase()));
    addEventListener('keyup', (e) => this.pressed.delete(e.key.toLowerCase()));
  }

  left() {
    return this.pressed.has('arrowleft') || this.pressed.has('a');
  }

  right() {
    return this.pressed.has('arrowright') || this.pressed.has('d');
  }

  jump() {
    return this.pressed.has(' ') || this.pressed.has('w') || this.pressed.has('arrowup');
  }

  restart() {
    return this.pressed.has('r');
  }
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

class Game {
  constructor() {
    this.input = new Input();
    this.reset();
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  reset() {
    this.state = 'playing';
    this.score = 0;
    this.cameraX = 0;
    this.player = {
      x: 60,
      y: 420,
      w: 34,
      h: 46,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
    };

    this.platforms = [
      { x: 0, y: WORLD.floorY, w: WORLD.levelWidth, h: 40 },
      { x: 280, y: 430, w: 160, h: 20 },
      { x: 560, y: 360, w: 180, h: 20 },
      { x: 900, y: 410, w: 220, h: 20 },
      { x: 1240, y: 340, w: 160, h: 20 },
      { x: 1540, y: 290, w: 140, h: 20 },
      { x: 1800, y: 350, w: 180, h: 20 },
      { x: 2080, y: 430, w: 180, h: 20 },
    ];

    this.coins = [
      { x: 330, y: 390, w: 18, h: 18, alive: true },
      { x: 620, y: 320, w: 18, h: 18, alive: true },
      { x: 980, y: 370, w: 18, h: 18, alive: true },
      { x: 1290, y: 300, w: 18, h: 18, alive: true },
      { x: 1840, y: 310, w: 18, h: 18, alive: true },
      { x: 2130, y: 390, w: 18, h: 18, alive: true },
    ];

    this.enemies = [
      { x: 700, y: 330, w: 34, h: 30, vx: -80, minX: 560, maxX: 740, alive: true },
      { x: 1650, y: 260, w: 34, h: 30, vx: 80, minX: 1540, maxX: 1680, alive: true },
    ];

    this.goal = { x: 2520, y: 380, w: 24, h: 120 };
  }

  loop(now) {
    const dt = Math.min((now - this.last) / 1000, 1 / 30);
    this.last = now;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (this.input.restart()) this.reset();
    if (this.state !== 'playing') return;

    const p = this.player;
    const speed = 260;

    if (this.input.left()) {
      p.vx = -speed;
      p.facing = -1;
    } else if (this.input.right()) {
      p.vx = speed;
      p.facing = 1;
    } else {
      p.vx *= 0.75;
      if (Math.abs(p.vx) < 2) p.vx = 0;
    }

    if (this.input.jump() && p.onGround) {
      p.vy = -650;
      p.onGround = false;
    }

    p.vy += WORLD.gravity * dt;

    p.x += p.vx * dt;
    this.resolveCollisionsX();

    p.y += p.vy * dt;
    p.onGround = false;
    this.resolveCollisionsY();

    if (p.y > canvas.height + 200) this.state = 'lose';

    for (const coin of this.coins) {
      if (coin.alive && intersects(p, coin)) {
        coin.alive = false;
        this.score += 10;
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.x += enemy.vx * dt;
      if (enemy.x < enemy.minX || enemy.x + enemy.w > enemy.maxX) enemy.vx *= -1;

      if (!intersects(p, enemy)) continue;

      const stomp = p.vy > 0 && p.y + p.h - enemy.y < 20;
      if (stomp) {
        enemy.alive = false;
        p.vy = -420;
        this.score += 25;
      } else {
        this.state = 'lose';
      }
    }

    if (intersects(p, this.goal)) this.state = 'win';

    this.cameraX = Math.max(0, Math.min(p.x - canvas.width * 0.35, WORLD.levelWidth - canvas.width));
  }

  resolveCollisionsX() {
    const p = this.player;
    for (const block of this.platforms) {
      if (!intersects(p, block)) continue;
      if (p.vx > 0) p.x = block.x - p.w;
      if (p.vx < 0) p.x = block.x + block.w;
      p.vx = 0;
    }

    p.x = Math.max(0, Math.min(p.x, WORLD.levelWidth - p.w));
  }

  resolveCollisionsY() {
    const p = this.player;
    for (const block of this.platforms) {
      if (!intersects(p, block)) continue;
      if (p.vy > 0) {
        p.y = block.y - p.h;
        p.vy = 0;
        p.onGround = true;
      } else if (p.vy < 0) {
        p.y = block.y + block.h;
        p.vy = 0;
      }
    }
  }

  render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-this.cameraX, 0);

    this.drawBackground();

    for (const block of this.platforms) {
      ctx.fillStyle = '#7a4a14';
      ctx.fillRect(block.x, block.y, block.w, block.h);
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(block.x, block.y, block.w, 6);
    }

    for (const coin of this.coins) {
      if (!coin.alive) continue;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(coin.x + 9, coin.y + 9, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.fillStyle = '#111827';
      ctx.fillRect(enemy.x + 4, enemy.y + 8, 6, 6);
      ctx.fillRect(enemy.x + 24, enemy.y + 8, 6, 6);
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.goal.x, this.goal.y, this.goal.w, this.goal.h);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(this.goal.x, this.goal.y, this.goal.w, 28);

    const p = this.player;
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(p.x + (p.facing === 1 ? p.w - 10 : 0), p.y + 10, 10, 10);

    ctx.restore();

    hud.textContent = `Счёт: ${this.score} | Монеты: ${this.coins.filter((c) => c.alive).length}/${this.coins.length} | Статус: ${this.statusText()}`;

    if (this.state !== 'playing') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '700 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.state === 'win' ? 'Победа!' : 'Поражение', canvas.width / 2, canvas.height / 2 - 16);
      ctx.font = '500 24px sans-serif';
      ctx.fillText('Нажми R для рестарта', canvas.width / 2, canvas.height / 2 + 22);
      ctx.textAlign = 'left';
    }
  }

  drawBackground() {
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(this.cameraX, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 10; i++) {
      const x = i * 320 + 40;
      const y = 80 + (i % 3) * 20;
      ctx.fillRect(x, y, 80, 24);
      ctx.fillRect(x + 20, y - 14, 34, 20);
    }

    ctx.fillStyle = '#4d7c0f';
    for (let i = 0; i < 12; i++) {
      const x = i * 260;
      const baseY = 500;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + 110, 290 + (i % 4) * 20);
      ctx.lineTo(x + 220, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }

  statusText() {
    if (this.state === 'win') return 'победа';
    if (this.state === 'lose') return 'поражение';
    return 'играем';
  }
}

new Game();
