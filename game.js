// Super Mihi Bros — a tiny side-scrolling platformer
// Atlas sprites:    sprites/extracted/sprite_NNN.png       (indices 0–999)
// Character sheet:  sprites/extracted/character/character_NNN.png
//                   (indices >= 1000, file index = idx - 1000)
(() => {
  const CHAR_BASE = 1000;
  const SPR = (n) => n >= CHAR_BASE
    ? `sprites/extracted/character/character_${String(n - CHAR_BASE).padStart(3,'0')}.png`
    : `sprites/extracted/sprite_${String(n).padStart(3,'0')}.png`;

  // Sprite groupings from the sheet (81 sprites: 000–080)
  const S = {
    // Player animations come from sprites/main_charcter.png
    // (extracted into sprites/extracted/character/).
    idle:   [1000, 1001, 1002],                        // 3 frames
    walk:   [1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010,
             1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019], // 17 frames
    run:    [1020, 1021, 1022, 1023, 1024, 1025, 1026, 1027,
             1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035],       // 16 frames
    // Jump strip (5 frames): crouch → leap → peak → descend → pre-land
    jumpStrip: [1036, 1037, 1038, 1039, 1040],
    land:   [1041, 1042, 1043],                        // 3 frames (on touchdown)
    powerup:[1044, 1045, 1046, 1047, 1048],            // 5 frames (mushroom grow)
    hurt:   [1049, 1050, 1051, 1052],                  // 4 frames
    death:  [1052],                                    // last hurt frame: lying down
    mushroom: 15,
    star: 16,
    flower: 17,
    feather: 18,
    coin: 44,
    goomba: 31,
    koopa: 32,
    piranha: 33,
    brick: 45,
    qblock: 46,
    pipe: 72,
    bush: 78,
    qblock2: 75,
    brickAlt: 76,
    brickAlt2: 77,
    hill: 73,
    flag: 79,
    castle: 80,
    ground: [69, 70, 71],
  };

  // Natural sprite sizes [w, h] from the atlas — used to preserve aspect ratio.
  const NAT = {
    // --- Player frames (from sprites/extracted/character/, indices 1000+)
    1000:[64,120], 1001:[64,120], 1002:[64,120],
    1003:[82,126], 1004:[82,126], 1005:[82,126], 1006:[82,126], 1007:[82,126],
    1008:[82,126], 1009:[82,126], 1010:[82,126], 1011:[82,126], 1012:[82,126],
    1013:[82,126], 1014:[82,126], 1015:[82,126], 1016:[82,126], 1017:[82,126],
    1018:[82,126], 1019:[82,126],
    1020:[89,111], 1021:[89,111], 1022:[89,111], 1023:[89,111], 1024:[89,111],
    1025:[89,111], 1026:[89,111], 1027:[89,111], 1028:[89,111], 1029:[89,111],
    1030:[89,111], 1031:[89,111], 1032:[89,111], 1033:[89,111], 1034:[89,111],
    1035:[89,111],
    1036:[87,120], 1037:[87,120], 1038:[87,120], 1039:[87,120], 1040:[87,120],
    1041:[105,115], 1042:[105,115], 1043:[105,115],
    1044:[84,122], 1045:[84,122], 1046:[84,122], 1047:[84,122], 1048:[84,122],
    1049:[129,120], 1050:[129,120], 1051:[129,120], 1052:[129,120],
    // --- Atlas frames (sprites/extracted/sprite_NNN.png)
    0:[56,112],   1:[56,112],   2:[56,112],   3:[56,112],
    4:[63,106],   5:[63,106],   6:[63,106],   7:[63,106],   8:[63,106],   9:[63,106],
    10:[78,106],  11:[78,106],  12:[78,106],  13:[78,106],  14:[78,106],
    15:[52,57],   16:[53,56],   17:[50,59],   18:[50,59],
    19:[61,73],   20:[66,94],
    21:[72,105],  22:[72,104],  23:[67,103],
    24:[63,102],  25:[67,103],  26:[61,97],   27:[62,98],   28:[61,97],
    29:[55,97],   30:[54,97],
    31:[66,75],   32:[71,95],   33:[72,122],
    34:[66,79],   35:[66,79],   36:[66,79],
    37:[54,92],   38:[55,89],   39:[54,87],
    40:[59,95],   41:[55,95],   42:[64,95],   43:[54,95],
    44:[47,59],   45:[57,59],   46:[57,59],
    47:[84,103],  48:[85,104],  49:[90,104],  50:[100,104],
    51:[57,130],  52:[57,183],  53:[58,183],
    54:[55,102],  55:[75,89],   56:[77,60],
    57:[63,38],   58:[53,53],   59:[34,48],
    60:[50,83],   61:[50,85],
    62:[76,114],  63:[104,153],
    64:[56,104],  65:[56,103],  66:[56,103],
    67:[66,107],  68:[65,105],
    69:[122,58],  70:[104,58],  71:[106,58],
    72:[68,75],   73:[107,81],  74:[105,81],
    75:[57,58],   76:[58,58],   77:[58,58],   78:[43,52],
    79:[64,154],  80:[92,156],
  };

  // World constants — units are pixels in world space
  const TILE = 48;
  // Uniform pixel scale: source-px → world-px. Chosen so a ~64px source tile ≈ TILE.
  const SCALE = TILE / 64;

  function natSize(idx, scale = SCALE) {
    const n = NAT[idx];
    return { w: n[0] * scale, h: n[1] * scale };
  }
  // Scale so that the rendered width hits a target (preserves aspect).
  function sizeForWidth(idx, targetW) {
    const n = NAT[idx];
    const s = targetW / n[0];
    return { w: targetW, h: n[1] * s, scale: s };
  }
  // Scale so that the rendered height hits a target (preserves aspect).
  function sizeForHeight(idx, targetH) {
    const n = NAT[idx];
    const s = targetH / n[1];
    return { w: n[0] * s, h: targetH, scale: s };
  }
  const GRAVITY = 1800;
  const MOVE_ACCEL = 1400;
  const RUN_MAX = 360;
  const WALK_MAX = 220;
  const FRICTION = 1200;
  const JUMP_VEL = -700;
  const RUN_JUMP_VEL = -780;
  const MAX_FALL = 1200;

  const WORLD_HEIGHT = 14 * TILE; // 672
  const GROUND_Y = WORLD_HEIGHT - 2 * TILE; // top of ground row

  // ---- Level layout ------------------------------------------------------
  // Build platforms as axis-aligned rectangles. Decorative items separate.
  // X positions in world pixels.
  const platforms = [];
  const decorations = []; // {sprite, x, y, w, h, flip?}
  const coins = [];       // {x, y, taken:false}
  const enemies = [];     // {type, x, y, vx, alive:true, ...}
  const blocks = [];      // {type:'brick'|'qblock', x, y, hit:false, item?}
  const pipes = [];       // {x, y, w, h}

  // Ground sections (gaps create pits)
  const groundSegments = [
    [0,    1700],
    [1820, 3000],
    [3120, 4200],
    [4320, 5800],
  ];
  const LEVEL_END = 6200;

  for (const [x0, x1] of groundSegments) {
    platforms.push({x: x0, y: GROUND_Y, w: x1 - x0, h: 2 * TILE, type: 'ground'});
    // Tile decorative ground sprites along the row (preserve aspect, anchor top to GROUND_Y).
    let i = 0;
    let x = x0;
    while (x < x1) {
      const idx = S.ground[i++ % S.ground.length];
      const sz = sizeForHeight(idx, TILE);
      decorations.push({sprite: SPR(idx), x, y: GROUND_Y, w: sz.w, h: sz.h});
      // Below row: brickAlt (a small filler rendered at TILE width to fill underground).
      const fill = sizeForWidth(S.brickAlt, sz.w);
      decorations.push({sprite: SPR(S.brickAlt), x, y: GROUND_Y + TILE, w: fill.w, h: fill.h});
      x += sz.w;
    }
  }

  // Hills / bushes (decor only) — rendered at natural aspect, anchored bottom to GROUND_Y.
  const decorScatter = [
    {s: S.hill, x: 200,  targetH: 90},
    {s: S.bush, x: 500,  targetH: 56},
    {s: S.hill, x: 1100, targetH: 90},
    {s: S.bush, x: 2200, targetH: 56},
    {s: S.hill, x: 2700, targetH: 90},
    {s: S.bush, x: 3500, targetH: 56},
    {s: S.bush, x: 4500, targetH: 56},
    {s: S.hill, x: 5000, targetH: 90},
  ];
  for (const d of decorScatter) {
    const sz = sizeForHeight(d.s, d.targetH);
    decorations.push({sprite: SPR(d.s), x: d.x, y: GROUND_Y - sz.h, w: sz.w, h: sz.h});
  }

  // Helper to add a brick/qblock platform tile
  function addBlock(type, x, y, item) {
    blocks.push({type, x, y, w: TILE, h: TILE, hit: false, item: item || null, bumpT: 0});
    platforms.push({x, y, w: TILE, h: TILE, type: 'block', ref: blocks[blocks.length - 1]});
  }

  // Question blocks & bricks rows
  addBlock('qblock', 6 * TILE,  GROUND_Y - 4 * TILE, 'coin');
  addBlock('brick',  9 * TILE,  GROUND_Y - 4 * TILE);
  addBlock('qblock', 10 * TILE, GROUND_Y - 4 * TILE, 'mushroom');
  addBlock('brick',  11 * TILE, GROUND_Y - 4 * TILE);
  addBlock('qblock', 10 * TILE, GROUND_Y - 8 * TILE, 'coin');

  addBlock('brick', 16 * TILE, GROUND_Y - 4 * TILE);
  addBlock('brick', 17 * TILE, GROUND_Y - 4 * TILE);
  addBlock('qblock',18 * TILE, GROUND_Y - 4 * TILE, 'coin');
  addBlock('brick', 19 * TILE, GROUND_Y - 4 * TILE);

  addBlock('qblock', 28 * TILE, GROUND_Y - 4 * TILE, 'mushroom');
  addBlock('brick',  34 * TILE, GROUND_Y - 4 * TILE);
  addBlock('brick',  35 * TILE, GROUND_Y - 4 * TILE);
  addBlock('brick',  36 * TILE, GROUND_Y - 4 * TILE);
  addBlock('qblock', 37 * TILE, GROUND_Y - 4 * TILE, 'coin');

  addBlock('brick', 70 * TILE, GROUND_Y - 4 * TILE);
  addBlock('qblock',71 * TILE, GROUND_Y - 4 * TILE, 'coin');
  addBlock('brick', 72 * TILE, GROUND_Y - 4 * TILE);

  // Stairs (pyramid)
  function pyramid(xStart, height) {
    for (let i = 0; i < height; i++) {
      const x = xStart + i * TILE;
      for (let j = 0; j <= i; j++) {
        const y = GROUND_Y - (j + 1) * TILE;
        platforms.push({x, y, w: TILE, h: TILE, type: 'stair'});
        const sz = sizeForWidth(S.brickAlt2, TILE);
        decorations.push({sprite: SPR(S.brickAlt2), x, y: y + (TILE - sz.h), w: sz.w, h: sz.h});
      }
    }
  }
  pyramid(45 * TILE, 4);
  pyramid(55 * TILE, 4);

  // Pipes (collidable). The sprite is rendered to EXACTLY fill the collision
  // rectangle so the visible pipe top matches the surface the player stands on.
  // (The pipe sprite has a wide lip, so non-uniform stretch is unnoticeable.)
  function addPipe(x, heightTiles) {
    const w = 2 * TILE;
    const h = heightTiles * TILE;
    const y = GROUND_Y - h;
    pipes.push({x, y, w, h});
    platforms.push({x, y, w, h, type: 'pipe'});
    decorations.push({sprite: SPR(S.pipe), x, y, w, h});
  }
  addPipe(13 * TILE, 2);
  addPipe(25 * TILE, 3);
  addPipe(40 * TILE, 2);
  addPipe(80 * TILE, 2);

  // Coins (free-floating)
  const coinPositions = [
    [7*TILE,  GROUND_Y - 2*TILE],
    [8*TILE,  GROUND_Y - 2*TILE],
    [12*TILE, GROUND_Y - 5*TILE],
    [20*TILE, GROUND_Y - 5*TILE],
    [21*TILE, GROUND_Y - 5*TILE],
    [22*TILE, GROUND_Y - 5*TILE],
    [30*TILE, GROUND_Y - 2*TILE],
    [31*TILE, GROUND_Y - 2*TILE],
    [50*TILE, GROUND_Y - 6*TILE],
    [60*TILE, GROUND_Y - 6*TILE],
    [75*TILE, GROUND_Y - 5*TILE],
    [76*TILE, GROUND_Y - 5*TILE],
  ];
  for (const [x, y] of coinPositions) {
    const sz = sizeForHeight(S.coin, 38);
    coins.push({x, y, w: sz.w, h: sz.h, taken: false});
  }

  // Enemies — collision box is square; sprite scaled to natural aspect.
  function addGoomba(x) {
    const sz = sizeForHeight(S.goomba, 48);
    enemies.push({
      type: 'goomba', x, y: GROUND_Y - sz.h, w: sz.w, h: sz.h,
      vx: -60, vy: 0, alive: true, squashedT: 0, anim: 0,
    });
  }
  addGoomba(15 * TILE);
  addGoomba(22 * TILE);
  addGoomba(23 * TILE);
  addGoomba(33 * TILE);
  addGoomba(48 * TILE);
  addGoomba(49 * TILE);
  addGoomba(58 * TILE);
  addGoomba(74 * TILE);
  addGoomba(78 * TILE);

  // Flag & castle near level end — natural aspect.
  const flagSize = sizeForHeight(S.flag, 6 * TILE);
  const flag = {x: LEVEL_END - 200, y: GROUND_Y - flagSize.h, w: flagSize.w, h: flagSize.h};
  const castleSize = sizeForHeight(S.castle, 5 * TILE);
  const castle = {x: LEVEL_END - 120, y: GROUND_Y - castleSize.h, w: castleSize.w, h: castleSize.h};
  decorations.push({sprite: SPR(S.flag),   x: flag.x,   y: flag.y,   w: flag.w,   h: flag.h});
  decorations.push({sprite: SPR(S.castle), x: castle.x, y: castle.y, w: castle.w, h: castle.h});

  // ---- Player -------------------------------------------------------------
  // Collision box is fixed; sprite is rendered scaled and centered horizontally.
  const PLAYER_SMALL_H = 88;
  const PLAYER_BIG_H = 116;
  // Reference natural height that maps to PLAYER_SMALL_H. All player frames are
  // drawn at the SAME pixel scale so the character does not pulse between frames.
  const PLAYER_REF_H = NAT[S.idle[0]][1]; // 115
  const player = {
    x: 80, y: GROUND_Y - PLAYER_SMALL_H, w: 40, h: PLAYER_SMALL_H,
    vx: 0, vy: 0,
    facing: 1,
    onGround: false,
    big: false,
    invincT: 0,
    state: 'idle',
    animT: 0,
    animFrame: 0,
    landT: 0,
    powerupT: 0,
    hurtT: 0,
    dead: false,
    deathT: 0,
    won: false,
    winT: 0,
  };

  // Stats
  const stats = { coins: 0, score: 0, lives: 3 };

  // Effects: coin pop, score popups, item entities
  const effects = []; // {kind, x, y, t, life, ...}
  const items = [];   // {type:'mushroom', x, y, vx, vy, w, h}

  // ---- Input --------------------------------------------------------------
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyR') Game.restart();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  // ---- DOM nodes pool -----------------------------------------------------
  const worldEl = document.getElementById('world');
  const gameEl = document.getElementById('game');

  // Static decoration nodes (created once)
  function makeImg(src, x, y, w, h, extraClass = '') {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'sprite ' + extraClass;
    img.style.left = x + 'px';
    img.style.top = y + 'px';
    img.style.width = w + 'px';
    img.style.height = h + 'px';
    worldEl.appendChild(img);
    return img;
  }

  // Sky band
  const skyBand = document.createElement('div');
  skyBand.style.cssText = `position:absolute;left:0;top:0;width:${LEVEL_END + 200}px;height:${WORLD_HEIGHT}px;`;
  worldEl.appendChild(skyBand);

  // Render decorations once
  for (const d of decorations) makeImg(d.sprite, d.x, d.y, d.w, d.h);

  // Render block nodes (so we can animate hits). Blocks are square in source,
  // rendered preserving aspect, anchored to the bottom of the TILE collision box.
  for (const b of blocks) {
    const idx = b.type === 'brick' ? S.brick : S.qblock;
    const sz = sizeForWidth(idx, TILE);
    b.renderW = sz.w; b.renderH = sz.h;
    b.renderOffsetY = TILE - sz.h;
    b.el = makeImg(SPR(idx), b.x, b.y + b.renderOffsetY, sz.w, sz.h);
  }

  // Render coin nodes
  for (const c of coins) {
    c.el = makeImg(SPR(S.coin), c.x, c.y, c.w, c.h);
  }

  // Enemy nodes
  for (const e of enemies) {
    e.el = makeImg(SPR(S.goomba), e.x, e.y, e.w, e.h);
  }

  // Player node — sized per-frame at render time.
  // Two stacked img layers cross-fade between consecutive animation frames
  // to act as tweened in-between images for a smoother walk/run.
  const playerEl = makeImg(SPR(S.idle[0]), player.x, player.y, player.w, player.h);
  playerEl.style.zIndex = 5;
  const playerEl2 = makeImg(SPR(S.idle[0]), player.x, player.y, player.w, player.h);
  playerEl2.style.zIndex = 5;
  playerEl2.style.opacity = '0';

  // ---- Camera -------------------------------------------------------------
  const camera = { x: 0, y: 0, scale: 1 };

  function updateCameraScale() {
    // Scale so world height fills viewport; horizontal scrolls.
    camera.scale = window.innerHeight / WORLD_HEIGHT;
  }
  updateCameraScale();
  window.addEventListener('resize', updateCameraScale);

  // ---- Collision helpers --------------------------------------------------
  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function moveAndCollide(entity, dx, dy, solids) {
    // Move X
    entity.x += dx;
    let collidedX = false;
    for (const p of solids) {
      if (aabb(entity, p)) {
        if (dx > 0) entity.x = p.x - entity.w;
        else if (dx < 0) entity.x = p.x + p.w;
        collidedX = true;
      }
    }
    // Move Y
    entity.y += dy;
    let onGround = false;
    let bumped = null;
    for (const p of solids) {
      if (aabb(entity, p)) {
        if (dy > 0) {
          entity.y = p.y - entity.h;
          onGround = true;
        } else if (dy < 0) {
          entity.y = p.y + p.h;
          if (p.type === 'block') bumped = p.ref;
        }
        entity.vy = 0;
      }
    }
    return { collidedX, onGround, bumped };
  }

  // ---- Game logic ---------------------------------------------------------
  function spawnEffect(kind, x, y) {
    if (kind === 'coinPop') {
      const sz = sizeForHeight(S.coin, 36);
      const el = document.createElement('img');
      el.src = SPR(S.coin);
      el.className = 'sprite';
      el.style.cssText = `left:${x}px;top:${y}px;width:${sz.w}px;height:${sz.h}px;z-index:6;`;
      worldEl.appendChild(el);
      effects.push({kind, el, x, y, vy: -300, t: 0, life: 0.5});
    } else if (kind === 'score') {
      const el = document.createElement('div');
      el.textContent = '+' + arguments[3];
      el.style.cssText = `position:absolute;left:${x}px;top:${y}px;color:#fff;font-family:monospace;font-size:18px;text-shadow:2px 2px 0 #000;z-index:7;`;
      worldEl.appendChild(el);
      effects.push({kind, el, x, y, vy: -120, t: 0, life: 0.8});
    }
  }

  function spawnItem(type, x, y) {
    let idx;
    if (type === 'mushroom') idx = S.mushroom;
    else if (type === 'flower') idx = S.flower;
    else                        idx = S.star;
    const sz = sizeForHeight(idx, 40);
    const el = makeImg(SPR(idx), x, y, sz.w, sz.h);
    el.style.zIndex = 4;
    items.push({type, x, y, w: sz.w, h: sz.h, vx: 80, vy: -200, el, emergeT: 0.5, emergeFromY: y});
  }

  function hitBlock(b) {
    if (b.hit) return;
    b.bumpT = 0.18;
    if (b.type === 'qblock') {
      b.hit = true;
      b.el.src = SPR(S.brickAlt2); // turn into used block
      if (b.item === 'coin') {
        stats.coins++;
        stats.score += 200;
        spawnEffect('coinPop', b.x + 8, b.y - 8);
        spawnEffect('score', b.x + 12, b.y - 8, 200);
      } else if (b.item === 'mushroom') {
        spawnItem(player.big ? 'flower' : 'mushroom', b.x + 4, b.y - 4);
      }
    } else if (b.type === 'brick') {
      if (player.big) {
        b.hit = true;
        b.el.style.display = 'none';
        // remove platform
        const idx = platforms.indexOf(platforms.find(p => p.ref === b));
        if (idx >= 0) platforms.splice(idx, 1);
        stats.score += 50;
      }
    }
  }

  function takeCoin(c) {
    c.taken = true;
    c.el.style.display = 'none';
    stats.coins++;
    stats.score += 100;
    spawnEffect('score', c.x, c.y - 4, 100);
  }

  function killGoomba(e) {
    e.alive = false;
    e.squashedT = 0.6;
    e.el.style.transform = 'scaleY(0.4)';
    e.el.style.transformOrigin = 'bottom';
    stats.score += 100;
    spawnEffect('score', e.x, e.y - 12, 100);
  }

  function hurtPlayer() {
    if (player.invincT > 0 || player.dead) return;
    if (player.big) {
      player.big = false;
      player.h = PLAYER_SMALL_H;
      player.invincT = 1.5;
      player.hurtT = 0.5;
    } else {
      killPlayer();
    }
  }

  function killPlayer() {
    if (player.dead) return;
    player.dead = true;
    player.deathT = 0;
    player.vy = -500;
    player.vx = 0;
  }

  function winLevel() {
    if (player.won) return;
    player.won = true;
    player.winT = 0;
    stats.score += 1000;
  }

  // ---- Per-frame update ---------------------------------------------------
  let last = performance.now();
  function loop(now) {
    let dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (player.won) {
      player.winT += dt;
      // walk player toward castle
      player.vx = 100;
      player.x += player.vx * dt;
      player.facing = 1;
      player.state = 'walk';
      player.animT += dt;
      // descend flagpole quickly first 0.6s
      if (player.winT < 1.0) {
        player.y = Math.min(GROUND_Y - player.h, player.y + 400 * dt);
      }
      if (player.winT > 4.0) {
        showOverlay('YOU WIN!', `Score: ${stats.score}   Coins: ${stats.coins}`);
      }
      return;
    }

    if (player.dead) {
      player.deathT += dt;
      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.deathT > 2.2) {
        stats.lives--;
        if (stats.lives <= 0) {
          showOverlay('GAME OVER', `Score: ${stats.score}`);
          return;
        }
        respawn();
      }
      return;
    }

    // Input
    const left = keys['ArrowLeft'] || keys['KeyA'];
    const right = keys['ArrowRight'] || keys['KeyD'];
    const run = keys['ShiftLeft'] || keys['ShiftRight'];
    const jumpPressed = keys['Space'] || keys['ArrowUp'] || keys['KeyW'];

    const maxSpeed = run ? RUN_MAX : WALK_MAX;
    if (left && !right) {
      player.vx -= MOVE_ACCEL * dt;
      player.facing = -1;
    } else if (right && !left) {
      player.vx += MOVE_ACCEL * dt;
      player.facing = 1;
    } else {
      // friction
      const f = FRICTION * dt;
      if (player.vx > f) player.vx -= f;
      else if (player.vx < -f) player.vx += f;
      else player.vx = 0;
    }
    if (player.vx > maxSpeed) player.vx = maxSpeed;
    if (player.vx < -maxSpeed) player.vx = -maxSpeed;

    // Jump (with edge detect)
    if (jumpPressed && player.onGround && !player._jumpHeld) {
      player.vy = run ? RUN_JUMP_VEL : JUMP_VEL;
      player.onGround = false;
    }
    // Variable jump height: cut velocity if released early
    if (!jumpPressed && player.vy < -200) player.vy = -200;
    player._jumpHeld = jumpPressed;

    // Gravity
    player.vy += GRAVITY * dt;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;

    // Move with collisions
    if (player.x < 0) { player.x = 0; player.vx = Math.max(0, player.vx); }
    const prevOnGround = player.onGround;
    const prevVy = player.vy;
    const res = moveAndCollide(player, player.vx * dt, player.vy * dt, platforms);
    player.onGround = res.onGround;
    if (res.bumped) hitBlock(res.bumped);
    // Landing impact → play land anim briefly when touching down after a real fall.
    if (!prevOnGround && player.onGround && prevVy > 280) {
      player.landT = 0.22;
    }

    // Off-screen fall
    if (player.y > WORLD_HEIGHT + 100) {
      killPlayer();
      return;
    }

    // Coin pickup
    for (const c of coins) {
      if (!c.taken && aabb(player, c)) takeCoin(c);
    }

    // Enemies update
    for (const e of enemies) {
      if (!e.alive) {
        e.squashedT -= dt;
        if (e.squashedT <= 0 && e.el.parentNode) {
          e.el.style.opacity = '0';
        }
        continue;
      }
      e.anim += dt;
      e.vy += GRAVITY * dt;
      // X movement with platform check
      e.x += e.vx * dt;
      for (const p of platforms) {
        if (aabb(e, p)) {
          if (e.vx > 0) e.x = p.x - e.w;
          else e.x = p.x + p.w;
          e.vx = -e.vx;
        }
      }
      e.y += e.vy * dt;
      let onG = false;
      for (const p of platforms) {
        if (aabb(e, p)) {
          if (e.vy > 0) { e.y = p.y - e.h; onG = true; }
          else e.y = p.y + p.h;
          e.vy = 0;
        }
      }
      // walk off ledge? simple: reverse if no ground ahead
      if (onG) {
        const probe = {x: e.x + (e.vx > 0 ? e.w + 2 : -2), y: e.y + e.h + 2, w: 1, h: 1};
        let supported = false;
        for (const p of platforms) if (aabb(probe, p)) { supported = true; break; }
        if (!supported) e.vx = -e.vx;
      }

      // Player vs enemy
      if (aabb(player, e)) {
        const playerBottom = player.y + player.h;
        if (player.vy > 50 && playerBottom - e.y < 30) {
          killGoomba(e);
          player.vy = JUMP_VEL * 0.6;
        } else {
          hurtPlayer();
        }
      }
    }

    // Items update
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.emergeT > 0) {
        it.emergeT -= dt;
        it.y -= 30 * dt;
        it.el.style.left = it.x + 'px';
        it.el.style.top = it.y + 'px';
        if (it.emergeT <= 0) it.vy = -100;
        continue;
      }
      it.vy += GRAVITY * dt;
      const itm = {x: it.x, y: it.y, w: it.w, h: it.h};
      // X
      itm.x += it.vx * dt;
      for (const p of platforms) {
        if (aabb(itm, p)) {
          if (it.vx > 0) itm.x = p.x - itm.w;
          else itm.x = p.x + p.w;
          it.vx = -it.vx;
        }
      }
      // Y
      itm.y += it.vy * dt;
      for (const p of platforms) {
        if (aabb(itm, p)) {
          if (it.vy > 0) itm.y = p.y - itm.h;
          else itm.y = p.y + p.h;
          it.vy = 0;
        }
      }
      it.x = itm.x; it.y = itm.y;
      it.el.style.left = it.x + 'px';
      it.el.style.top = it.y + 'px';
      // Pickup
      if (aabb(player, it)) {
        if (it.type === 'mushroom' && !player.big) {
          player.big = true;
          const dh = PLAYER_BIG_H - PLAYER_SMALL_H;
          player.h = PLAYER_BIG_H;
          player.y -= dh;
          player.powerupT = 0.5;
        }
        stats.score += 1000;
        spawnEffect('score', it.x, it.y - 4, 1000);
        it.el.remove();
        items.splice(i, 1);
      }
      // Despawn
      if (it.y > WORLD_HEIGHT + 100) { it.el.remove(); items.splice(i, 1); }
    }

    // Block bump animation
    for (const b of blocks) {
      if (b.bumpT > 0) {
        b.bumpT -= dt;
        const offset = Math.sin((1 - Math.max(0, b.bumpT) / 0.18) * Math.PI) * -10;
        b.el.style.top = (b.y + (b.renderOffsetY || 0) + offset) + 'px';
      }
    }

    // Effects update
    for (let i = effects.length - 1; i >= 0; i--) {
      const fx = effects[i];
      fx.t += dt;
      if (fx.kind === 'coinPop') {
        fx.vy += 600 * dt;
        fx.y += fx.vy * dt;
        fx.el.style.top = fx.y + 'px';
      } else if (fx.kind === 'score') {
        fx.y += fx.vy * dt;
        fx.el.style.top = fx.y + 'px';
        fx.el.style.opacity = String(1 - fx.t / fx.life);
      }
      if (fx.t >= fx.life) {
        fx.el.remove();
        effects.splice(i, 1);
      }
    }

    // Flag check
    if (aabb(player, flag)) winLevel();

    // Invincibility timer
    if (player.invincT > 0) player.invincT -= dt;
    if (player.powerupT > 0) player.powerupT -= dt;
    if (player.landT > 0) player.landT -= dt;
    if (player.hurtT > 0) player.hurtT -= dt;

    // Animation state
    player.animT += dt;
    let nextState;
    if (player.hurtT > 0) {
      nextState = 'hurt';
    } else if (player.powerupT > 0) {
      nextState = 'powerup';
    } else if (!player.onGround) {
      nextState = player.vy < 0 ? 'jump' : 'fall';
    } else if (player.landT > 0 && Math.abs(player.vx) < WALK_MAX) {
      nextState = 'land';
    } else if (Math.abs(player.vx) > 10) {
      nextState = Math.abs(player.vx) > WALK_MAX + 10 ? 'run' : 'walk';
    } else {
      nextState = 'idle';
    }
    if (nextState !== player.state) {
      player.state = nextState;
      player.animT = 0;
    }
  }

  function getPlayerFrameInfo() {
    // Returns { a, b, t } — sprite indices to cross-fade and the blend factor.
    if (player.dead) return { a: S.death[0], b: S.death[0], t: 0 };
    let frames;
    switch (player.state) {
      case 'walk': frames = S.walk; break;
      case 'run':  frames = S.run; break;
      case 'jump': {
        // Select from jumpStrip by vertical velocity.
        //  vy < -200: still rising strongly      → 1014 (leap) (briefly 1013 at liftoff)
        //  -200 ≤ vy ≤ 120: near apex             → 1015 (peak)
        const vy = player.vy;
        let idx;
        if (player.animT < 0.06) idx = S.jumpStrip[0];           // crouch/liftoff
        else if (vy < -200)      idx = S.jumpStrip[1];           // leap
        else                     idx = S.jumpStrip[2];           // peak
        return { a: idx, b: idx, t: 0 };
      }
      case 'fall': {
        const idx = player.vy > 520 ? S.jumpStrip[4] : S.jumpStrip[3];
        return { a: idx, b: idx, t: 0 };
      }
      case 'land': {
        // Play the 3-frame land anim across landT's 0.22s window.
        const progress = 1 - Math.max(0, player.landT) / 0.22;
        const idx = S.land[Math.min(S.land.length - 1, Math.floor(progress * S.land.length))];
        return { a: idx, b: idx, t: 0 };
      }
      case 'powerup': {
        // Play the 5-frame powerup anim across powerupT's 0.5s window.
        const progress = 1 - Math.max(0, player.powerupT) / 0.5;
        const idx = S.powerup[Math.min(S.powerup.length - 1, Math.floor(progress * S.powerup.length))];
        return { a: idx, b: idx, t: 0 };
      }
      case 'hurt': {
        // Play the hurt anim across hurtT's 0.5s window.
        const progress = 1 - Math.max(0, player.hurtT) / 0.5;
        const idx = S.hurt[Math.min(S.hurt.length - 1, Math.floor(progress * S.hurt.length))];
        return { a: idx, b: idx, t: 0 };
      }
      case 'idle': {
        // Idle is a subtle breathing cycle. Snap between frames (no cross-fade)
        // because the sprites share a canvas but the character bobs vertically,
        // and tweening makes the silhouette appear to shrink/ghost at the top.
        const idleFps = 3;
        const idx = S.idle[Math.floor(player.animT * idleFps) % S.idle.length];
        return { a: idx, b: idx, t: 0 };
      }
      default:     frames = S.idle;
    }
    let fps;
    if (player.state === 'walk') {
      fps = 8 + (Math.abs(player.vx) / WALK_MAX) * 6;  // 8–14
    } else if (player.state === 'run') {
      fps = 14 + (Math.abs(player.vx) / RUN_MAX) * 8;  // 14–22
    } else {
      fps = 3;
    }
    // Snap frames (no cross-fade). Cross-fading pixel-art limbs produces a
    // ghosted double-exposure look, so we show one crisp frame at a time.
    const idx = frames[Math.floor(player.animT * fps) % frames.length];
    return { a: idx, b: idx, t: 0 };
  }

  function applyPlayerLayer(el, idx, alpha) {
    const targetSrc = SPR(idx);
    if (el.dataset.src !== targetSrc) {
      el.src = targetSrc;
      el.dataset.src = targetSrc;
    }
    const nat = NAT[idx];
    const playerScale = player.h / nat[1];
    const renderW = nat[0] * playerScale;
    const renderH = player.h;
    const renderX = player.x + (player.w - renderW) / 2;
    const renderY = player.y + (player.h - renderH);
    el.style.left = renderX + 'px';
    el.style.top = renderY + 'px';
    el.style.width = renderW + 'px';
    el.style.height = renderH + 'px';
    const flip = player.facing < 0 ? 'scaleX(-1)' : '';
    el.style.transform = flip;
    el.style.opacity = String(alpha);
  }

  function render() {
    // Player visual — cross-fade two consecutive frames as tweened in-betweens.
    const fi = getPlayerFrameInfo();
    // Smoothstep the blend so the cross-fade feels easier on the eye.
    const tt = fi.t * fi.t * (3 - 2 * fi.t);
    let baseAlpha = 1;
    let blendAlpha = tt;
    // Hurt blink overrides both layers.
    if (player.invincT > 0 && Math.floor(player.invincT * 10) % 2 === 0) {
      baseAlpha *= 0.4;
      blendAlpha *= 0.4;
    }
    applyPlayerLayer(playerEl, fi.a, baseAlpha);
    applyPlayerLayer(playerEl2, fi.b, blendAlpha);

    // Update enemy frames
    for (const e of enemies) {
      if (!e.alive) continue;
      e.el.style.left = e.x + 'px';
      e.el.style.top = e.y + 'px';
      e.el.style.width = e.w + 'px';
      e.el.style.height = e.h + 'px';
      // wobble
      e.el.style.transform = `scaleX(${e.vx > 0 ? -1 : 1}) translateY(${Math.sin(e.anim * 8) * 1.5}px)`;
    }

    // Camera follow
    const viewW = window.innerWidth / camera.scale;
    const viewH = window.innerHeight / camera.scale;
    let camX = player.x + player.w / 2 - viewW / 2;
    camX = Math.max(0, Math.min(LEVEL_END - viewW, camX));
    let camY = WORLD_HEIGHT - viewH;
    camera.x = camX;
    camera.y = camY;
    worldEl.style.transform = `scale(${camera.scale}) translate(${-camX}px, ${-camY}px)`;

    // HUD
    document.getElementById('coins').textContent = String(stats.coins).padStart(2,'0');
    document.getElementById('score').textContent = String(stats.score).padStart(6,'0');
    document.getElementById('lives').textContent = stats.lives;
  }

  function respawn() {
    player.x = 80;
    player.y = GROUND_Y - PLAYER_SMALL_H;
    player.vx = 0; player.vy = 0;
    player.facing = 1;
    player.dead = false;
    player.invincT = 1.5;
    player.hurtT = 0;
    player.powerupT = 0;
    player.landT = 0;
    player.big = false;
    player.h = PLAYER_SMALL_H;
  }

  function showOverlay(title, sub) {
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-sub').textContent = sub;
    document.getElementById('overlay').style.display = 'flex';
  }

  window.Game = {
    restart() { location.reload(); }
  };

  requestAnimationFrame((t) => { last = t; loop(t); });
})();
