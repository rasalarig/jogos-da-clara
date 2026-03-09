const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const characterSelectElement = document.getElementById("characterSelect");
const touchControlsElement = document.getElementById("touchControls");

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
  completionMessageTimer: 0,
  missingHint: "",
};

const finalFlag = {
  x: WORLD_WIDTH - 12,
  y: 8,
};

const CHARACTER_STYLES = {
  oldman: {
    name: "Velhinho Carismatico",
    skin: "#efc8a8",
    hair: "#d9d9d9",
    top: "#8d6e63",
    bottom: "#6d4c41",
    shoes: "#3d405b",
    hat: "#6a8caf",
    beard: true,
    bodyScale: 1,
    dress: false,
  },
  girl: {
    name: "Menina de Vestido",
    skin: "#f2c7a2",
    hair: "#5d3b2f",
    top: "#ff6fb5",
    bottom: "#ff97ca",
    shoes: "#7b2cbf",
    hat: null,
    beard: false,
    bodyScale: 1,
    dress: true,
  },
  boy: {
    name: "Menino de Bone e Bermuda",
    skin: "#edc4a3",
    hair: "#2f3a4b",
    top: "#2f80ed",
    bottom: "#38bdf8",
    shoes: "#2d3142",
    hat: "#ef476f",
    beard: false,
    bodyScale: 1,
    dress: false,
  },
  chubby: {
    name: "Gordo Gente Boa",
    skin: "#f0c2a2",
    hair: "#3d2b1f",
    top: "#f3722c",
    bottom: "#f8961e",
    shoes: "#3a0f4f",
    hat: null,
    beard: false,
    bodyScale: 1.23,
    dress: false,
  },
  explorer: {
    name: "Exploradora Rapida",
    skin: "#f0c7a8",
    hair: "#1f2937",
    top: "#06d6a0",
    bottom: "#118ab2",
    shoes: "#073b4c",
    hat: "#f4a261",
    beard: false,
    bodyScale: 1,
    dress: false,
  },
};

const player = {
  x: 22,
  y: 16,
  width: 0.8,
  height: 1.8,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1,
  health: 100,
  fireCooldown: 0,
  damageCooldown: 0,
  characterId: "girl",
};

const camera = {
  x: 0,
  y: 0,
};

let gameStarted = false;
let actionCooldown = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (mouse.x === 0 && mouse.y === 0) {
    mouse.x = canvas.width * 0.5;
    mouse.y = canvas.height * 0.5;
  }
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

function mineBlock(x, y) {
  const block = getBlock(x, y);
  const info = BLOCK_INFO[block];
  if (!info?.mineable) {
    return;
  }
  setBlock(x, y, BLOCKS.AIR);
}

function placeBlock(x, y) {
  if (getBlock(x, y) !== BLOCKS.AIR) {
    return;
  }

  if (playerIntersectsBlock(x, y)) {
    return;
  }

  setBlock(x, y, BLOCKS.DIRT);
}

function handleBuildActions(dt) {
  actionCooldown -= dt;
  if (actionCooldown > 0) {
    return;
  }

  if (!mouse.left && !mouse.right) {
    return;
  }

  const target = screenToWorld(mouse.x, mouse.y);
  if (distanceToPlayer(target.x, target.y) > REACH) {
    return;
  }

  if (mouse.left) {
    mineBlock(target.x, target.y);
    actionCooldown = 0.12;
    return;
  }

  if (mouse.right) {
    placeBlock(target.x, target.y);
    actionCooldown = 0.12;
  }
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
    sparkleSeed: Math.random() * 10,
  });

  createEnemyGuarding(x, y, -2);
  createEnemyGuarding(x, y, 2);

  return true;
}

function spawnDiamondsAndGuards() {
  diamonds.length = 0;
  mission.collectedDiamonds = 0;
  mission.totalDiamonds = DIAMOND_TOTAL;
  mission.missingHint = "";
  mission.victory = false;
  mission.completionMessageTimer = 0;

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

  mission.totalDiamonds = diamonds.length;
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
  mission.completionMessageTimer = Math.max(0, mission.completionMessageTimer - dt);

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

      if (mission.collectedDiamonds >= mission.totalDiamonds) {
        mission.missingHint = "Missao cumprida! Volte para a bandeira final!";
        mission.completionMessageTimer = 3.2;
      }
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
  const baseW = player.width * TILE_SIZE;
  const h = player.height * TILE_SIZE;
  const style = CHARACTER_STYLES[player.characterId] ?? CHARACTER_STYLES.girl;
  const drawW = baseW * style.bodyScale;
  const drawX = sx - (drawW - baseW) * 0.5;
  const headH = Math.floor(h * 0.35);
  const bodyTop = sy + headH;
  const bodyH = h - headH;
  const headW = drawW * 0.88;
  const headX = drawX + (drawW - headW) * 0.5;

  ctx.fillStyle = style.skin;
  ctx.fillRect(headX, sy, headW, headH);

  ctx.fillStyle = style.hair;
  ctx.fillRect(headX, sy, headW, 5);

  if (style.hat) {
    ctx.fillStyle = style.hat;
    ctx.fillRect(headX - 1, sy - 4, headW + 2, 4);
    ctx.fillRect(headX + 2, sy - 7, headW - 4, 3);
  }

  if (style.dress) {
    ctx.fillStyle = style.top;
    ctx.fillRect(drawX + 1, bodyTop, drawW - 2, bodyH);
    ctx.fillStyle = style.bottom;
    ctx.fillRect(drawX + 1, bodyTop, drawW - 2, 4);
  } else {
    ctx.fillStyle = style.top;
    ctx.fillRect(drawX + 1, bodyTop, drawW - 2, bodyH * 0.58);
    ctx.fillStyle = style.bottom;
    ctx.fillRect(drawX + 2, bodyTop + bodyH * 0.58, drawW - 4, bodyH * 0.42);
  }

  const shoeW = Math.max(5, drawW * 0.34);
  ctx.fillStyle = style.shoes;
  ctx.fillRect(drawX + 1, sy + h - 4, shoeW, 4);
  ctx.fillRect(drawX + drawW - shoeW - 1, sy + h - 4, shoeW, 4);

  ctx.fillStyle = "#1f2937";
  ctx.fillRect(headX + 4, sy + 8, 4, 4);
  ctx.fillRect(headX + headW - 8, sy + 8, 4, 4);

  if (style.beard) {
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(headX + 2, sy + headH - 5, headW - 4, 4);
  } else {
    ctx.fillStyle = "#293241";
    ctx.fillRect(headX + 5, sy + headH - 6, headW - 10, 3);
  }

  // Barra de vida em cima da personagem.
  const lifePercent = player.health / 100;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(drawX - 2, sy - 10, drawW + 4, 6);
  ctx.fillStyle = lifePercent > 0.3 ? "#42d96b" : "#ff595e";
  ctx.fillRect(drawX - 1, sy - 9, (drawW + 2) * lifePercent, 4);
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
  const sparkleTime = performance.now() * 0.0045;

  diamonds.forEach((diamond) => {
    if (diamond.collected) {
      return;
    }

    const sx = diamond.x * TILE_SIZE - camera.x;
    const sy = diamond.y * TILE_SIZE - camera.y;
    const w = diamond.width * TILE_SIZE;
    const h = diamond.height * TILE_SIZE;
    const phase = sparkleTime + diamond.sparkleSeed;
    const pulse = 0.7 + Math.sin(phase * 2.1) * 0.22;

    // Halo de brilho para destacar os diamantes no mapa.
    ctx.save();
    ctx.globalAlpha = 0.34 * pulse;
    ctx.fillStyle = diamond.color;
    ctx.beginPath();
    ctx.ellipse(sx + w * 0.5, sy + h * 0.52, w * 1.1, h * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = diamond.color;
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.5, sy);
    ctx.lineTo(sx + w, sy + h * 0.45);
    ctx.lineTo(sx + w * 0.5, sy + h);
    ctx.lineTo(sx, sy + h * 0.45);
    ctx.closePath();
    ctx.fill();

    const sparkleAlpha = 0.45 + Math.sin(phase * 3.3) * 0.35;
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0.25, sparkleAlpha)})`;
    ctx.fillRect(sx + w * 0.4, sy + h * 0.15, 4, 4);

    // Festa de brilho com particulas orbitando o diamante.
    for (let p = 0; p < 5; p += 1) {
      const orbit = phase * (0.9 + p * 0.15) + p * 1.2;
      const ox = Math.cos(orbit) * (w * (0.5 + p * 0.1));
      const oy = Math.sin(orbit * 1.3) * (h * (0.45 + p * 0.09));
      const px = sx + w * 0.5 + ox;
      const py = sy + h * 0.48 + oy;

      ctx.fillStyle = `rgba(255,255,255,${0.2 + ((p + 1) / 10)})`;
      ctx.fillRect(px, py, 2, 2);
    }

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(sx + w * 0.15, sy + h * 0.45, 3, 3);
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
  ctx.fillRect(14, 14, 560, 86);
  ctx.fillStyle = "#ffffff";
  ctx.font = "10px 'Press Start 2P', monospace";
  ctx.fillText(
    `Diamantes: ${mission.collectedDiamonds}/${mission.totalDiamonds} - Va para a bandeira`,
    24,
    42
  );

  // Faixa superior de progresso por cor: coletado = cor original, faltando = cinza.
  const chipSize = 18;
  const chipStartX = 24;
  const chipY = 56;
  for (let i = 0; i < mission.totalDiamonds; i += 1) {
    const diamond = diamonds[i];
    const collected = Boolean(diamond?.collected);
    const chipColor = collected ? diamond.color : "#6a6f7a";
    const x = chipStartX + i * (chipSize + 10);

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x - 2, chipY - 2, chipSize + 4, chipSize + 4);
    ctx.fillStyle = chipColor;
    ctx.fillRect(x, chipY, chipSize, chipSize);

    if (!collected) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 2, chipY + 2);
      ctx.lineTo(x + chipSize - 2, chipY + chipSize - 2);
      ctx.stroke();
    }
  }

  if (mission.victoryMessageTimer > 0 && mission.missingHint) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(14, 68, 520, 34);
    ctx.fillStyle = "#ffcf56";
    ctx.fillText(mission.missingHint, 24, 89);
  }

  if (mission.completionMessageTimer > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(14, 106, 590, 34);
    ctx.fillStyle = "#7dffb3";
    ctx.fillText("Missao cumprida! Todos os diamantes foram coletados!", 24, 127);
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#9ed9ff");
  sky.addColorStop(0.62, "#bde8ff");
  sky.addColorStop(1, "#f5f6ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function render() {
  drawBackground();
  drawWorld();
  drawDiamonds();
  drawFinalFlag();
  drawEnemies();
  drawFireballs();
  drawPlayer();
  drawMissionOverlay();

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
  if (!gameStarted) {
    return;
  }

  const key = event.key.toLowerCase();
  keys.add(key);

  if (key === "x") {
    shootFireball();
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

  canvas.addEventListener("pointermove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });

  canvas.addEventListener("pointerdown", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });

  canvas.addEventListener("mousedown", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    if (event.button === 0) {
      mouse.left = true;
    }
    if (event.button === 2) {
      mouse.right = true;
    }
  });

  window.addEventListener("mouseup", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
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

function setTouchKeyState(key, isDown) {
  if (!gameStarted) {
    return;
  }

  if (isDown) {
    keys.add(key);
  } else {
    keys.delete(key);
  }
}

function setTouchActionState(action, isDown) {
  if (!gameStarted) {
    return;
  }

  if (mouse.x === 0 && mouse.y === 0) {
    mouse.x = canvas.width * 0.5;
    mouse.y = canvas.height * 0.5;
  }

  if (action === "fire" && isDown) {
    shootFireball();
  }

  if (action === "mine") {
    mouse.left = isDown;
  }

  if (action === "place") {
    mouse.right = isDown;
  }
}

function setupTouchControls() {
  if (!touchControlsElement) {
    return;
  }

  const buttons = touchControlsElement.querySelectorAll(".touch-btn");
  buttons.forEach((button) => {
    const key = button.dataset.key;
    const action = button.dataset.action;

    const press = (event) => {
      event.preventDefault();
      button.classList.add("active");
      if (key) {
        setTouchKeyState(key, true);
      }
      if (action) {
        setTouchActionState(action, true);
      }
    };

    const release = (event) => {
      event.preventDefault();
      button.classList.remove("active");
      if (key) {
        setTouchKeyState(key, false);
      }
      if (action === "mine" || action === "place") {
        setTouchActionState(action, false);
      }
    };

    button.addEventListener("pointerdown", press, { passive: false });
    button.addEventListener("pointerup", release, { passive: false });
    button.addEventListener("pointercancel", release, { passive: false });
    button.addEventListener("pointerleave", release, { passive: false });
  });
}

function startGame(characterId) {
  if (gameStarted) {
    return;
  }

  const selected = CHARACTER_STYLES[characterId];
  if (!selected) {
    return;
  }

  player.characterId = characterId;
  gameStarted = true;
  characterSelectElement.classList.add("hidden");
  previousTime = performance.now();
  accumulator = 0;
  requestAnimationFrame(gameLoop);
}

function setupCharacterSelection() {
  const cards = characterSelectElement.querySelectorAll(".character-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      startGame(card.dataset.character);
    });
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
    handleBuildActions(fixedStep);
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
  setupCharacterSelection();
  setupTouchControls();

  const generated = generateWorld();
  for (let y = 0; y < WORLD_HEIGHT; y += 1) {
    world[y] = generated[y];
  }

  findSpawnPosition();
  spawnEnemies(5);
  spawnDiamondsAndGuards();
  updateFinalFlagPosition();
  updateCamera();
  render();
}

init();
