const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const hotbarElement = document.getElementById("hotbar");

const TILE_SIZE = 32;
const WORLD_WIDTH = 240;
const WORLD_HEIGHT = 96;
const GRAVITY = 34;
const PLAYER_SPEED = 7.5;
const JUMP_SPEED = 12.5;
const REACH = 8;
const ENEMY_SPEED = 2.2;
const FIREBALL_SPEED = 15;
const FIREBALL_LIFETIME = 1.2;
const CREATIVE_BUILD = true;
const DIAMOND_TOTAL = 7;

const BLOCKS = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
  LEAVES: 5,
  SAND: 6,
  WATER: 7,
  BEDROCK: 8,
};

const BLOCK_INFO = {
  [BLOCKS.AIR]: { name: "Ar", color: "#000000", solid: false, mineable: false },
  [BLOCKS.GRASS]: { name: "Grama", color: "#5aa43d", solid: true, mineable: true },
  [BLOCKS.DIRT]: { name: "Terra", color: "#8f5f33", solid: true, mineable: true },
  [BLOCKS.STONE]: { name: "Pedra", color: "#8a909a", solid: true, mineable: true },
  [BLOCKS.WOOD]: { name: "Madeira", color: "#9a693b", solid: true, mineable: true },
  [BLOCKS.LEAVES]: { name: "Folhas", color: "#2f8b52", solid: true, mineable: true },
  [BLOCKS.SAND]: { name: "Areia", color: "#d5be74", solid: true, mineable: true },
  [BLOCKS.WATER]: { name: "Agua", color: "#4f89cf", solid: false, mineable: false },
  [BLOCKS.BEDROCK]: { name: "Bedrock", color: "#3a3d43", solid: true, mineable: false },
};

const HOTBAR_BLOCKS = [
  BLOCKS.DIRT,
  BLOCKS.STONE,
  BLOCKS.WOOD,
  BLOCKS.LEAVES,
  BLOCKS.SAND,
  BLOCKS.GRASS,
];

const world = [];
const keys = new Set();
const mouse = { x: 0, y: 0, left: false, right: false };
const enemies = [];
const fireballs = [];
const diamonds = [];
const diamondColors = ["#22d3ee", "#ef476f", "#ffd166", "#06d6a0", "#a78bfa", "#ff9f1c", "#3a86ff"];

const mission = {
  collectedDiamonds: 0,
  totalDiamonds: DIAMOND_TOTAL,
  victory: false,
  victoryMessageTimer: 0,
  missingHint: "",
};

const finalFlag = {
  x: WORLD_WIDTH - 12,
  y: 8,
};

const inventory = {
  [BLOCKS.GRASS]: 99,
  [BLOCKS.DIRT]: 160,
  [BLOCKS.STONE]: 160,
  [BLOCKS.WOOD]: 120,
  [BLOCKS.LEAVES]: 120,
  [BLOCKS.SAND]: 120,
};

const player = {
  x: 22,
  y: 16,
  width: 0.8,
  height: 1.8,
  vx: 0,
  vy: 0,
  onGround: false,
  selectedSlot: 0,
  facing: 1,
  health: 100,
  fireCooldown: 0,
  damageCooldown: 0,
};

const camera = {
  x: 0,
  y: 0,
};

let hotbarDirty = true;
let actionCooldown = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createArray(width, height, value = 0) {
  const arr = new Array(height);
  for (let y = 0; y < height; y += 1) {
    arr[y] = new Array(width).fill(value);
  }
  return arr;
}

function getBlock(x, y) {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return BLOCKS.BEDROCK;
  }
  return world[y][x];
}

function setBlock(x, y, block) {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return;
  }
  world[y][x] = block;
}

function generateWorld() {
  const map = createArray(WORLD_WIDTH, WORLD_HEIGHT, BLOCKS.AIR);
  let ground = Math.floor(WORLD_HEIGHT * 0.35);

  for (let x = 0; x < WORLD_WIDTH; x += 1) {
    const wave = Math.sin(x * 0.12) * 2 + Math.sin(x * 0.035) * 5;
    const jitter = (Math.random() - 0.5) * 1.5;
    ground = Math.max(20, Math.min(52, ground + jitter * 0.2));
    const height = Math.floor(ground + wave);

    for (let y = height; y < WORLD_HEIGHT; y += 1) {
      if (y === height) {
        map[y][x] = BLOCKS.GRASS;
      } else if (y < height + 4) {
        map[y][x] = BLOCKS.DIRT;
      } else {
        map[y][x] = BLOCKS.STONE;
      }
    }

    if (x > 8 && x < WORLD_WIDTH - 8 && Math.random() < 0.08) {
      spawnTree(map, x, height - 1);
    }

    if (height < 28) {
      for (let y = height; y < Math.min(height + 4, WORLD_HEIGHT - 2); y += 1) {
        map[y][x] = BLOCKS.SAND;
      }
    }
  }

  carveCaves(map);

  for (let x = 0; x < WORLD_WIDTH; x += 1) {
    map[WORLD_HEIGHT - 1][x] = BLOCKS.BEDROCK;
  }

  return map;
}

function spawnTree(map, x, y) {
  const trunkHeight = 3 + Math.floor(Math.random() * 3);

  for (let i = 0; i < trunkHeight; i += 1) {
    const ty = y - i;
    if (ty > 2) {
      map[ty][x] = BLOCKS.WOOD;
    }
  }

  const top = y - trunkHeight;
  for (let ly = top - 2; ly <= top + 1; ly += 1) {
    for (let lx = x - 2; lx <= x + 2; lx += 1) {
      if (lx <= 1 || lx >= WORLD_WIDTH - 1 || ly <= 1 || ly >= WORLD_HEIGHT - 1) {
        continue;
      }
      const dist = Math.abs(lx - x) + Math.abs(ly - top);
      if (dist <= 3 && map[ly][lx] === BLOCKS.AIR) {
        map[ly][lx] = BLOCKS.LEAVES;
      }
    }
  }
}

function carveCaves(map) {
  for (let y = 26; y < WORLD_HEIGHT - 5; y += 1) {
    for (let x = 2; x < WORLD_WIDTH - 2; x += 1) {
      const block = map[y][x];
      if ((block === BLOCKS.STONE || block === BLOCKS.DIRT) && Math.random() < 0.06) {
        map[y][x] = BLOCKS.AIR;
      }
    }
  }

  for (let pass = 0; pass < 3; pass += 1) {
    for (let y = 26; y < WORLD_HEIGHT - 5; y += 1) {
      for (let x = 2; x < WORLD_WIDTH - 2; x += 1) {
        const neighbors = countSolidNeighbors(map, x, y);
        if (map[y][x] === BLOCKS.AIR && neighbors > 5) {
          map[y][x] = BLOCKS.STONE;
        } else if (map[y][x] !== BLOCKS.AIR && neighbors < 3) {
          map[y][x] = BLOCKS.AIR;
        }
      }
    }
  }
}

function countSolidNeighbors(map, x, y) {
  let count = 0;
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      if (ox === 0 && oy === 0) {
        continue;
      }
      const block = map[y + oy][x + ox];
      if (BLOCK_INFO[block].solid) {
        count += 1;
      }
    }
  }
  return count;
}

function isSolid(block) {
  return BLOCK_INFO[block]?.solid ?? true;
}

function isAreaFree(px, py, w, h) {
  const startX = Math.floor(px);
  const endX = Math.floor(px + w - 0.0001);
  const startY = Math.floor(py);
  const endY = Math.floor(py + h - 0.0001);

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      if (isSolid(getBlock(x, y))) {
        return false;
      }
    }
  }
  return true;
}

function updatePlayer(dt) {
  const moveLeft = keys.has("a") || keys.has("arrowleft");
  const moveRight = keys.has("d") || keys.has("arrowright");
  const jump = keys.has(" ") || keys.has("w") || keys.has("arrowup");

  if (moveLeft === moveRight) {
    player.vx = 0;
  } else if (moveLeft) {
    player.vx = -PLAYER_SPEED;
    player.facing = -1;
  } else if (moveRight) {
    player.vx = PLAYER_SPEED;
    player.facing = 1;
  }

  if (jump && player.onGround) {
    player.vy = -JUMP_SPEED;
    player.onGround = false;
  }

  player.vy += GRAVITY * dt;

  moveAndCollideX(player.vx * dt);
  moveAndCollideY(player.vy * dt);

  if (player.fireCooldown > 0) {
    player.fireCooldown -= dt;
  }

  if (player.damageCooldown > 0) {
    player.damageCooldown -= dt;
  }
}

function moveAndCollideX(amount) {
  if (amount === 0) {
    return;
  }

  const step = Math.sign(amount) * 0.05;
  let traveled = 0;

  while (Math.abs(traveled) < Math.abs(amount)) {
    const delta = Math.abs(amount - traveled) < Math.abs(step) ? amount - traveled : step;
    const nextX = player.x + delta;

    if (isAreaFree(nextX, player.y, player.width, player.height)) {
      player.x = nextX;
      traveled += delta;
    } else {
      player.vx = 0;
      break;
    }
  }
}

function moveAndCollideY(amount) {
  player.onGround = false;
  if (amount === 0) {
    return;
  }

  const step = Math.sign(amount) * 0.05;
  let traveled = 0;

  while (Math.abs(traveled) < Math.abs(amount)) {
    const delta = Math.abs(amount - traveled) < Math.abs(step) ? amount - traveled : step;
    const nextY = player.y + delta;

    if (isAreaFree(player.x, nextY, player.width, player.height)) {
      player.y = nextY;
      traveled += delta;
    } else {
      if (delta > 0) {
        player.onGround = true;
      }
      player.vy = 0;
      break;
    }
  }
}

function screenToWorld(screenX, screenY) {
  return {
    x: Math.floor((screenX + camera.x) / TILE_SIZE),
    y: Math.floor((screenY + camera.y) / TILE_SIZE),
  };
}

function distanceToPlayer(blockX, blockY) {
  const cx = player.x + player.width * 0.5;
  const cy = player.y + player.height * 0.5;
  const dx = blockX + 0.5 - cx;
  const dy = blockY + 0.5 - cy;
  return Math.hypot(dx, dy);
}

function playerIntersectsBlock(blockX, blockY) {
  return !(
    player.x + player.width <= blockX ||
    player.x >= blockX + 1 ||
    player.y + player.height <= blockY ||
    player.y >= blockY + 1
  );
}

function handleMouseActions(dt) {
  actionCooldown -= dt;
  if (actionCooldown > 0) {
    return;
  }

  const target = screenToWorld(mouse.x, mouse.y);
  if (distanceToPlayer(target.x, target.y) > REACH) {
    return;
  }

  if (mouse.left) {
    mineBlock(target.x, target.y);
    actionCooldown = 0.12;
  } else if (mouse.right) {
    placeBlock(target.x, target.y);
    actionCooldown = 0.12;
  }
}

function mineBlock(x, y) {
  const block = getBlock(x, y);
  const info = BLOCK_INFO[block];
  if (!info.mineable) {
    return;
  }

  setBlock(x, y, BLOCKS.AIR);
  inventory[block] = (inventory[block] ?? 0) + 1;
  hotbarDirty = true;
}

function placeBlock(x, y) {
  if (getBlock(x, y) !== BLOCKS.AIR) {
    return;
  }

  if (playerIntersectsBlock(x, y)) {
    return;
  }

  const selectedBlock = HOTBAR_BLOCKS[player.selectedSlot];
  if (!CREATIVE_BUILD && (inventory[selectedBlock] ?? 0) <= 0) {
    return;
  }

  setBlock(x, y, selectedBlock);
  if (!CREATIVE_BUILD) {
    inventory[selectedBlock] -= 1;
  }
  hotbarDirty = true;
}

function createEnemy(x, y) {
  return {
    x,
    y,
    width: 0.8,
    height: 1.7,
    vx: 0,
    vy: 0,
    onGround: false,
    health: 3,
    direction: Math.random() < 0.5 ? -1 : 1,
    aiJumpTimer: 0,
    guardX: x,
    guardRange: 4,
  };
}

function trySpawnEnemyAt(x, y) {
  if (
    getBlock(x, y) === BLOCKS.AIR &&
    getBlock(x, y + 1) === BLOCKS.AIR &&
    isSolid(getBlock(x, y + 2))
  ) {
    enemies.push(createEnemy(x, y));
    return true;
  }
  return false;
}

function spawnEnemies(total) {
  let created = 0;
  let attempts = 0;
  while (created < total && attempts < total * 80) {
    attempts += 1;
    const x = 8 + Math.floor(Math.random() * (WORLD_WIDTH - 16));
    const minY = Math.max(6, Math.floor(player.y - 14));
    const maxY = Math.min(WORLD_HEIGHT - 10, minY + 28);
    const y = minY + Math.floor(Math.random() * Math.max(2, maxY - minY));

    if (distanceToPlayer(x, y) < 8) {
      continue;
    }

    if (trySpawnEnemyAt(x, y)) {
      created += 1;
    }
  }
}

function createEnemyGuarding(guardX, guardY, offsetX = 0) {
  const enemyX = guardX + offsetX;
  if (
    getBlock(enemyX, guardY) === BLOCKS.AIR &&
    getBlock(enemyX, guardY + 1) === BLOCKS.AIR &&
    isSolid(getBlock(enemyX, guardY + 2))
  ) {
    const enemy = createEnemy(enemyX, guardY);
    enemy.guardX = guardX;
    enemy.guardRange = 5;
    enemies.push(enemy);
    return true;
  }
  return false;
}

function findSurfaceAtColumn(x) {
  for (let y = 4; y < WORLD_HEIGHT - 4; y += 1) {
    if (
      getBlock(x, y) === BLOCKS.AIR &&
      getBlock(x, y + 1) === BLOCKS.AIR &&
      isSolid(getBlock(x, y + 2))
    ) {
      return y;
    }
  }
  return -1;
}

function spawnDiamondWithGuards(x, color) {
  const y = findSurfaceAtColumn(x);
  if (y < 0) {
    return false;
  }

  diamonds.push({
    x,
    y: y + 0.15,
    width: 0.6,
    height: 0.6,
    color,
    collected: false,
  });

  createEnemyGuarding(x, y, -2);
  createEnemyGuarding(x, y, 2);

  return true;
}

function spawnDiamondsAndGuards() {
  diamonds.length = 0;
  mission.collectedDiamonds = 0;
  mission.missingHint = "";
  mission.victory = false;

  const segments = mission.totalDiamonds;
  for (let i = 0; i < segments; i += 1) {
    const segmentWidth = Math.floor((WORLD_WIDTH - 30) / segments);
    const baseX = 14 + i * segmentWidth;
    let placed = false;

    for (let attempt = 0; attempt < 30 && !placed; attempt += 1) {
      const offset = Math.floor(Math.random() * Math.max(4, segmentWidth - 6));
      const x = Math.min(WORLD_WIDTH - 12, baseX + offset);
      if (Math.abs(x - Math.floor(player.x)) < 8) {
        continue;
      }
      placed = spawnDiamondWithGuards(x, diamondColors[i % diamondColors.length]);
    }
  }
}

function updateFinalFlagPosition() {
  for (let x = WORLD_WIDTH - 10; x >= WORLD_WIDTH - 35; x -= 1) {
    const y = findSurfaceAtColumn(x);
    if (y > 0) {
      finalFlag.x = x;
      finalFlag.y = y;
      return;
    }
  }
}

function moveEntityAndCollideX(entity, amount) {
  if (amount === 0) {
    return false;
  }

  const step = Math.sign(amount) * 0.05;
  let traveled = 0;
  let blocked = false;

  while (Math.abs(traveled) < Math.abs(amount)) {
    const delta = Math.abs(amount - traveled) < Math.abs(step) ? amount - traveled : step;
    const nextX = entity.x + delta;

    if (isAreaFree(nextX, entity.y, entity.width, entity.height)) {
      entity.x = nextX;
      traveled += delta;
    } else {
      entity.vx = 0;
      blocked = true;
      break;
    }
  }

  return blocked;
}

function moveEntityAndCollideY(entity, amount) {
  entity.onGround = false;
  if (amount === 0) {
    return;
  }

  const step = Math.sign(amount) * 0.05;
  let traveled = 0;

  while (Math.abs(traveled) < Math.abs(amount)) {
    const delta = Math.abs(amount - traveled) < Math.abs(step) ? amount - traveled : step;
    const nextY = entity.y + delta;

    if (isAreaFree(entity.x, nextY, entity.width, entity.height)) {
      entity.y = nextY;
      traveled += delta;
    } else {
      if (delta > 0) {
        entity.onGround = true;
      }
      entity.vy = 0;
      break;
    }
  }
}

function rectanglesOverlap(a, b) {
  return !(
    a.x + a.width <= b.x ||
    a.x >= b.x + b.width ||
    a.y + a.height <= b.y ||
    a.y >= b.y + b.height
  );
}

function damagePlayer(amount) {
  if (player.damageCooldown > 0) {
    return;
  }
  player.health = Math.max(0, player.health - amount);
  player.damageCooldown = 0.7;
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];

    if (enemy.health <= 0) {
      enemies.splice(i, 1);
      continue;
    }

    const playerCenterX = player.x + player.width * 0.5;
    const enemyCenterX = enemy.x + enemy.width * 0.5;
    const dx = playerCenterX - enemyCenterX;
    const nearPlayer = Math.abs(dx) < 14;

    if (nearPlayer) {
      enemy.direction = dx < 0 ? -1 : 1;
    } else {
      const backToGuard = enemy.guardX - enemyCenterX;
      if (Math.abs(backToGuard) > enemy.guardRange) {
        enemy.direction = backToGuard < 0 ? -1 : 1;
      }
    }

    enemy.vx = enemy.direction * ENEMY_SPEED;
    enemy.vy += GRAVITY * dt;
    enemy.aiJumpTimer -= dt;

    const blocked = moveEntityAndCollideX(enemy, enemy.vx * dt);
    if (blocked) {
      enemy.direction *= -1;
      if (enemy.onGround && enemy.aiJumpTimer <= 0) {
        enemy.vy = -8.2;
        enemy.aiJumpTimer = 0.6;
      }
    }

    moveEntityAndCollideY(enemy, enemy.vy * dt);

    if (rectanglesOverlap(player, enemy)) {
      damagePlayer(8);
    }
  }
}

function updateDiamondsAndFlag(dt) {
  mission.victoryMessageTimer = Math.max(0, mission.victoryMessageTimer - dt);

  if (mission.victory || player.health <= 0) {
    return;
  }

  for (let i = 0; i < diamonds.length; i += 1) {
    const diamond = diamonds[i];
    if (diamond.collected) {
      continue;
    }

    if (rectanglesOverlap(player, diamond)) {
      diamond.collected = true;
      mission.collectedDiamonds += 1;
      mission.missingHint = "";
    }
  }

  const flagBox = {
    x: finalFlag.x + 0.2,
    y: finalFlag.y - 1.7,
    width: 0.6,
    height: 1.7,
  };

  if (rectanglesOverlap(player, flagBox)) {
    if (mission.collectedDiamonds >= mission.totalDiamonds) {
      mission.victory = true;
    } else {
      const missing = mission.totalDiamonds - mission.collectedDiamonds;
      mission.missingHint = `Faltam ${missing} diamantes para liberar a bandeira!`;
      mission.victoryMessageTimer = 1.8;
    }
  }
}

function shootFireball() {
  if (player.fireCooldown > 0) {
    return;
  }

  const centerX = player.x + player.width * 0.5;
  const centerY = player.y + player.height * 0.52;

  fireballs.push({
    x: centerX,
    y: centerY,
    vx: player.facing * FIREBALL_SPEED,
    vy: -0.2,
    radius: 0.2,
    life: FIREBALL_LIFETIME,
  });

  player.fireCooldown = 0.3;
}

function updateFireballs(dt) {
  for (let i = fireballs.length - 1; i >= 0; i -= 1) {
    const fireball = fireballs[i];
    fireball.life -= dt;
    if (fireball.life <= 0) {
      fireballs.splice(i, 1);
      continue;
    }

    const subSteps = 4;
    let hit = false;

    for (let step = 0; step < subSteps; step += 1) {
      fireball.x += (fireball.vx * dt) / subSteps;
      fireball.y += (fireball.vy * dt) / subSteps;

      const blockX = Math.floor(fireball.x);
      const blockY = Math.floor(fireball.y);
      const hitBlock = getBlock(blockX, blockY);
      if (hitBlock !== BLOCKS.AIR) {
        if (BLOCK_INFO[hitBlock].mineable) {
          setBlock(blockX, blockY, BLOCKS.AIR);
        }
        hit = true;
        break;
      }

      for (let e = enemies.length - 1; e >= 0; e -= 1) {
        const enemy = enemies[e];
        const withinX = fireball.x >= enemy.x && fireball.x <= enemy.x + enemy.width;
        const withinY = fireball.y >= enemy.y && fireball.y <= enemy.y + enemy.height;
        if (withinX && withinY) {
          enemy.health -= 1;
          enemy.vx += player.facing * 2;
          hit = true;
          break;
        }
      }

      if (hit) {
        break;
      }
    }

    if (hit) {
      fireballs.splice(i, 1);
    }
  }
}

function updateCamera() {
  camera.x = Math.floor((player.x + player.width * 0.5) * TILE_SIZE - canvas.width * 0.5);
  camera.y = Math.floor((player.y + player.height * 0.5) * TILE_SIZE - canvas.height * 0.58);

  const maxX = WORLD_WIDTH * TILE_SIZE - canvas.width;
  const maxY = WORLD_HEIGHT * TILE_SIZE - canvas.height;
  camera.x = Math.max(0, Math.min(maxX, camera.x));
  camera.y = Math.max(0, Math.min(maxY, camera.y));
}

function drawBlock(block, sx, sy) {
  if (block === BLOCKS.AIR) {
    return;
  }

  const base = BLOCK_INFO[block].color;
  ctx.fillStyle = base;
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(sx, sy, TILE_SIZE, 5);

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(sx, sy + TILE_SIZE - 5, TILE_SIZE, 5);
}

function drawWorld() {
  const startX = Math.floor(camera.x / TILE_SIZE);
  const startY = Math.floor(camera.y / TILE_SIZE);
  const endX = Math.min(WORLD_WIDTH - 1, Math.ceil((camera.x + canvas.width) / TILE_SIZE));
  const endY = Math.min(WORLD_HEIGHT - 1, Math.ceil((camera.y + canvas.height) / TILE_SIZE));

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const block = getBlock(x, y);
      if (block === BLOCKS.AIR) {
        continue;
      }
      const sx = x * TILE_SIZE - camera.x;
      const sy = y * TILE_SIZE - camera.y;
      drawBlock(block, sx, sy);
    }
  }
}

function drawPlayer() {
  const sx = player.x * TILE_SIZE - camera.x;
  const sy = player.y * TILE_SIZE - camera.y;
  const w = player.width * TILE_SIZE;
  const h = player.height * TILE_SIZE;

  const headHeight = Math.floor(h * 0.38);
  const dressTop = sy + headHeight;
  const dressHeight = h - headHeight;

  // Cabeca
  ctx.fillStyle = "#f2c7a2";
  ctx.fillRect(sx, sy, w, headHeight);

  // Vestido rosa
  ctx.fillStyle = "#ff6fb5";
  ctx.fillRect(sx, dressTop, w, dressHeight);

  ctx.fillStyle = "#ff97ca";
  ctx.fillRect(sx, dressTop, w, 4);

  // Sapato roxo
  ctx.fillStyle = "#7b2cbf";
  ctx.fillRect(sx + 2, sy + h - 4, Math.max(5, w * 0.35), 4);
  ctx.fillRect(sx + w - Math.max(7, w * 0.35) - 2, sy + h - 4, Math.max(5, w * 0.35), 4);

  ctx.fillStyle = "#293241";
  ctx.fillRect(sx + 4, sy + 8, 5, 5);
  ctx.fillRect(sx + w - 9, sy + 8, 5, 5);
  ctx.fillRect(sx + 6, sy + headHeight - 5, w - 12, 3);

  // Barra de vida em cima da personagem.
  const lifePercent = player.health / 100;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(sx - 2, sy - 10, w + 4, 6);
  ctx.fillStyle = lifePercent > 0.3 ? "#42d96b" : "#ff595e";
  ctx.fillRect(sx - 1, sy - 9, (w + 2) * lifePercent, 4);
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    const sx = enemy.x * TILE_SIZE - camera.x;
    const sy = enemy.y * TILE_SIZE - camera.y;
    const w = enemy.width * TILE_SIZE;
    const h = enemy.height * TILE_SIZE;

    ctx.fillStyle = "#5d3a2f";
    ctx.fillRect(sx, sy, w, h);

    ctx.fillStyle = "#f4f1de";
    ctx.fillRect(sx + 3, sy + 7, 4, 4);
    ctx.fillRect(sx + w - 7, sy + 7, 4, 4);

    const life = Math.max(0, enemy.health / 3);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(sx, sy - 7, w, 4);
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(sx, sy - 7, w * life, 4);
  });
}

function drawFireballs() {
  fireballs.forEach((fireball) => {
    const sx = fireball.x * TILE_SIZE - camera.x;
    const sy = fireball.y * TILE_SIZE - camera.y;
    const radius = fireball.radius * TILE_SIZE;

    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ff7b00";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sx - 1, sy - 1, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd166";
    ctx.fill();
  });
}

function drawDiamonds() {
  diamonds.forEach((diamond) => {
    if (diamond.collected) {
      return;
    }

    const sx = diamond.x * TILE_SIZE - camera.x;
    const sy = diamond.y * TILE_SIZE - camera.y;
    const w = diamond.width * TILE_SIZE;
    const h = diamond.height * TILE_SIZE;

    ctx.fillStyle = diamond.color;
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.5, sy);
    ctx.lineTo(sx + w, sy + h * 0.45);
    ctx.lineTo(sx + w * 0.5, sy + h);
    ctx.lineTo(sx, sy + h * 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(sx + w * 0.4, sy + h * 0.15, 4, 4);
  });
}

function drawFinalFlag() {
  const poleX = finalFlag.x * TILE_SIZE - camera.x;
  const poleY = (finalFlag.y - 2) * TILE_SIZE - camera.y;

  ctx.fillStyle = "#e5e5e5";
  ctx.fillRect(poleX, poleY, 4, TILE_SIZE * 2);

  const canWin = mission.collectedDiamonds >= mission.totalDiamonds;
  ctx.fillStyle = canWin ? "#2ec4b6" : "#ef476f";
  ctx.fillRect(poleX + 4, poleY + 3, 20, 13);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(poleX + 4, poleY + 3, 20, 3);
}

function drawMissionOverlay() {
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(0,0,0,0.48)";
  ctx.fillRect(14, 14, 430, 46);
  ctx.fillStyle = "#ffffff";
  ctx.font = "10px 'Press Start 2P', monospace";
  ctx.fillText(
    `Diamantes: ${mission.collectedDiamonds}/${mission.totalDiamonds} - Va para a bandeira`,
    24,
    42
  );

  if (mission.victoryMessageTimer > 0 && mission.missingHint) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(14, 68, 520, 34);
    ctx.fillStyle = "#ffcf56";
    ctx.fillText(mission.missingHint, 24, 89);
  }
}

function drawTargetCursor() {
  const target = screenToWorld(mouse.x, mouse.y);
  const sx = target.x * TILE_SIZE - camera.x;
  const sy = target.y * TILE_SIZE - camera.y;

  ctx.strokeStyle = distanceToPlayer(target.x, target.y) <= REACH ? "#ffffff" : "#ff6666";
  ctx.lineWidth = 2;
  ctx.strokeRect(sx + 1, sy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#9ed9ff");
  sky.addColorStop(0.62, "#bde8ff");
  sky.addColorStop(1, "#f5f6ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function renderHotbar() {
  if (!hotbarDirty) {
    return;
  }

  hotbarElement.innerHTML = "";

  HOTBAR_BLOCKS.forEach((blockId, index) => {
    const slot = document.createElement("div");
    slot.className = `hotbar-slot ${index === player.selectedSlot ? "selected" : ""}`;

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = BLOCK_INFO[blockId].color;

    const count = document.createElement("div");
    count.className = "count";
    count.textContent = `${index + 1}: ${inventory[blockId] ?? 0}`;

    slot.appendChild(swatch);
    slot.appendChild(count);
    hotbarElement.appendChild(slot);
  });

  hotbarDirty = false;
}

function render() {
  drawBackground();
  drawWorld();
  drawDiamonds();
  drawFinalFlag();
  drawEnemies();
  drawFireballs();
  drawPlayer();
  drawTargetCursor();
  drawMissionOverlay();
  renderHotbar();

  if (player.health <= 0) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Voce foi derrotada", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.fillText("Recarregue para jogar novamente", canvas.width / 2, canvas.height / 2 + 20);
  }

  if (mission.victory) {
    ctx.fillStyle = "rgba(7, 24, 36, 0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Vitoria!", canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.fillText("Todos os diamantes coletados", canvas.width / 2, canvas.height / 2 + 18);
  }
}

function findSpawnPosition() {
  for (let x = 12; x < WORLD_WIDTH - 12; x += 1) {
    for (let y = 8; y < WORLD_HEIGHT - 8; y += 1) {
      if (
        getBlock(x, y) === BLOCKS.AIR &&
        getBlock(x, y + 1) === BLOCKS.AIR &&
        isSolid(getBlock(x, y + 2))
      ) {
        player.x = x;
        player.y = y;
        return;
      }
    }
  }
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  keys.add(key);

  if (key === "x") {
    shootFireball();
  }

  const slot = Number.parseInt(key, 10);
  if (slot >= 1 && slot <= HOTBAR_BLOCKS.length) {
    player.selectedSlot = slot - 1;
    hotbarDirty = true;
  }
}

function handleKeyUp(event) {
  keys.delete(event.key.toLowerCase());
}

function setupEvents() {
  window.addEventListener("resize", resizeCanvas);

  window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
      event.preventDefault();
    }
    handleKeyDown(event);
  });

  window.addEventListener("keyup", handleKeyUp);

  canvas.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });

  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
      mouse.left = true;
    }
    if (event.button === 2) {
      mouse.right = true;
    }
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      mouse.left = false;
    }
    if (event.button === 2) {
      mouse.right = false;
    }
  });

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}

let previousTime = performance.now();
let accumulator = 0;
const fixedStep = 1 / 60;

function gameLoop(timestamp) {
  const deltaSeconds = Math.min(0.05, (timestamp - previousTime) / 1000);
  previousTime = timestamp;
  accumulator += deltaSeconds;

  while (accumulator >= fixedStep) {
    updatePlayer(fixedStep);
    handleMouseActions(fixedStep);
    updateEnemies(fixedStep);
    updateFireballs(fixedStep);
    updateDiamondsAndFlag(fixedStep);
    updateCamera();
    accumulator -= fixedStep;
  }

  render();
  requestAnimationFrame(gameLoop);
}

function init() {
  resizeCanvas();
  setupEvents();

  const generated = generateWorld();
  for (let y = 0; y < WORLD_HEIGHT; y += 1) {
    world[y] = generated[y];
  }

  findSpawnPosition();
  spawnEnemies(5);
  spawnDiamondsAndGuards();
  updateFinalFlagPosition();
  updateCamera();
  renderHotbar();

  requestAnimationFrame(gameLoop);
}

init();
