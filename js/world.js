(function (Aqua) {
  const { Bodies, Body, Composite, Constraint } = Matter;
  const CAT = Aqua.CAT;
  const C = Aqua.COLORS;

  function wall(cx, cy, w, h, style) {
    return Bodies.rectangle(cx, cy, w, h, {
      isStatic: true,
      friction: 0.02,
      frictionStatic: 0.02,
      restitution: 0.04,
      chamfer: style.chamfer ? { radius: style.chamfer } : undefined,
      label: style.label || "wall",
      collisionFilter: {
        category: style.category || CAT.WALL,
        mask: style.mask || 0xffff,
      },
      render: {
        fillStyle: style.fill,
        strokeStyle: style.stroke || "rgba(255,255,255,0.08)",
        lineWidth: 1,
        visible: style.visible !== false,
      },
    });
  }

  function sideSegments(length, holes) {
    const sorted = (holes || []).slice().sort((a, b) => a.offset - b.offset);
    const segs = [];
    let cursor = 0;
    for (const hole of sorted) {
      const hs = Math.max(0, hole.offset);
      const he = Math.min(length, hole.offset + hole.size);
      if (hs > cursor + 1) segs.push([cursor, hs]);
      cursor = Math.max(cursor, he);
    }
    if (cursor < length - 1) segs.push([cursor, length]);
    return segs;
  }

  function chamber(spec) {
    const { x, y, w, h, t = Aqua.LAYOUT.wall, holes = [], fill, stroke, label } = spec;
    const bodies = [];
    const make = (cx, cy, ww, hh) =>
      wall(cx, cy, Math.max(ww, t), Math.max(hh, t), { fill, stroke, label, chamfer: 1 });

    for (const [s, e] of sideSegments(w, holes.filter((h) => h.side === "top"))) {
      const padL = s === 0 ? t / 2 : 0;
      const padR = e === w ? t / 2 : 0;
      make(x + (s + e) / 2 + (padR - padL) / 2, y, e - s + padL + padR, t);
    }
    for (const [s, e] of sideSegments(w, holes.filter((h) => h.side === "bottom"))) {
      const padL = s === 0 ? t / 2 : 0;
      const padR = e === w ? t / 2 : 0;
      make(x + (s + e) / 2 + (padR - padL) / 2, y + h, e - s + padL + padR, t);
    }
    for (const [s, e] of sideSegments(h, holes.filter((h) => h.side === "left"))) {
      const padT = s === 0 ? t / 2 : 0;
      const padB = e === h ? t / 2 : 0;
      make(x, y + (s + e) / 2 + (padB - padT) / 2, t, e - s + padT + padB);
    }
    for (const [s, e] of sideSegments(h, holes.filter((h) => h.side === "right"))) {
      const padT = s === 0 ? t / 2 : 0;
      const padB = e === h ? t / 2 : 0;
      make(x + w, y + (s + e) / 2 + (padB - padT) / 2, t, e - s + padT + padB);
    }
    return bodies;
  }

  function cardinal(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) >= Math.abs(dy)) return { x: Math.sign(dx) || 1, y: 0 };
    return { x: 0, y: Math.sign(dy) || 1 };
  }

  function pipeFromCenterline(points, inner, thickness, style) {
    const bodies = [];
    const sensors = [];
    const opts = { fill: style.fill, stroke: style.stroke, label: style.label || "pipe", chamfer: 1 };
    const t = thickness;
    const half = inner / 2;

    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const dir = cardinal(a, b);
      const trimA = i > 0 ? half : 0;
      const trimB = i < points.length - 2 ? half : 0;
      if (dir.y === 0) {
        const goingRight = dir.x > 0;
        const left = Math.min(a.x, b.x) + (goingRight ? trimA : trimB);
        const right = Math.max(a.x, b.x) - (goingRight ? trimB : trimA);
        const cx = (left + right) / 2;
        const len = Math.max(8, right - left);
        bodies.push(wall(cx, a.y - half - t / 2, len, t, opts));
        bodies.push(wall(cx, a.y + half + t / 2, len, t, opts));
      } else {
        const goingDown = dir.y > 0;
        const top = Math.min(a.y, b.y) + (goingDown ? trimA : trimB);
        const bottom = Math.max(a.y, b.y) - (goingDown ? trimB : trimA);
        const cy = (top + bottom) / 2;
        const len = Math.max(8, bottom - top);
        bodies.push(wall(a.x - half - t / 2, cy, t, len, opts));
        bodies.push(wall(a.x + half + t / 2, cy, t, len, opts));
      }
      const pad = half + 3;
      sensors.push({
        bounds: {
          min: { x: Math.min(a.x, b.x) - pad, y: Math.min(a.y, b.y) - pad },
          max: { x: Math.max(a.x, b.x) + pad, y: Math.max(a.y, b.y) + pad },
        },
        dir,
        zone: style.zone,
        strength: style.strength || 1,
      });
    }

    for (let i = 1; i < points.length - 1; i += 1) {
      const joint = points[i];
      const dirIn = cardinal(points[i - 1], joint);
      const dirOut = cardinal(joint, points[i + 1]);
      const opens = new Set();
      const sideOf = (dx, dy) => (dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "bottom" : "top");
      opens.add(sideOf(-dirIn.x, -dirIn.y));
      opens.add(sideOf(dirOut.x, dirOut.y));
      const box = inner + t;
      if (!opens.has("top")) bodies.push(wall(joint.x, joint.y - box / 2, box + t, t, opts));
      if (!opens.has("bottom")) bodies.push(wall(joint.x, joint.y + box / 2, box + t, t, opts));
      if (!opens.has("left")) bodies.push(wall(joint.x - box / 2, joint.y, t, box + t, opts));
      if (!opens.has("right")) bodies.push(wall(joint.x + box / 2, joint.y, t, box + t, opts));
    }
    return { bodies, sensors };
  }

  function makeWater(x, y) {
    const r = 4.3 + Math.random() * 0.6;
    const body = Bodies.circle(x, y, r, {
      label: "water",
      restitution: 0.04,
      friction: 0.0006,
      frictionAir: 0.005,
      frictionStatic: 0.001,
      density: 0.00085,
      slop: 0.05,
      collisionFilter: {
        category: CAT.WATER,
        mask: CAT.WALL | CAT.WATER | CAT.IMPELLER | CAT.MEDIA | CAT.PLANT | CAT.WASTE,
      },
      render: {
        fillStyle: C.water,
        strokeStyle: C.waterStroke,
        lineWidth: 1,
      },
    });
    body.plugin = { kind: "water", zone: "tank" };
    return body;
  }

  function makeImpeller(x, y) {
    const hub = Bodies.circle(x, y, 7, {
      render: { fillStyle: C.impeller, strokeStyle: "#fff3", lineWidth: 1 },
    });
    const blades = [hub];
    for (let i = 0; i < 6; i += 1) {
      const ang = (i / 6) * Math.PI * 2;
      blades.push(
        Bodies.rectangle(x + Math.cos(ang) * 13, y + Math.sin(ang) * 13, 16, 4.5, {
          angle: ang,
          render: { fillStyle: C.blade, strokeStyle: "#0002", lineWidth: 1 },
        })
      );
    }
    const impeller = Body.create({
      parts: blades,
      frictionAir: 0.01,
      density: 0.002,
      label: "impeller",
      collisionFilter: { category: CAT.IMPELLER, mask: CAT.WASTE | CAT.FOOD },
    });
    const axle = Constraint.create({
      bodyA: impeller,
      pointA: { x: 0, y: 0 },
      pointB: { x, y },
      length: 0,
      stiffness: 1,
      damping: 0.08,
      render: { strokeStyle: "rgba(230, 208, 168, 0.7)", lineWidth: 2 },
    });
    return { impeller, axle };
  }

  function pinMedia(cx, cy, n, radius, label, fill, spreadX, spreadY) {
    const items = [];
    for (let i = 0; i < n; i += 1) {
      const px = cx + (Math.random() - 0.5) * spreadX;
      const py = cy + (Math.random() - 0.5) * spreadY;
      const ball = Bodies.circle(px, py, radius + Math.random() * 1.4, {
        label,
        friction: 0.12,
        frictionAir: 0.04,
        density: 0.0016,
        restitution: 0.15,
        collisionFilter: {
          category: CAT.MEDIA,
          mask: CAT.WALL | CAT.WATER | CAT.MEDIA | CAT.WASTE | CAT.FOOD,
        },
        render: {
          fillStyle: fill,
          strokeStyle: "rgba(255,255,255,0.14)",
          lineWidth: 1,
        },
      });
      ball.plugin = { kind: "media", origin: { x: px, y: py } };
      const pin = Constraint.create({
        bodyA: ball,
        pointB: { x: px, y: py },
        length: 10 + Math.random() * 10,
        stiffness: 0.018,
        damping: 0.12,
        render: { strokeStyle: "rgba(255,255,255,0.07)", lineWidth: 1 },
      });
      items.push(ball, pin);
    }
    return items;
  }

  function targetWaterCount(volumeL) {
    const t = (volumeL - Aqua.VOLUME_MIN) / (Aqua.VOLUME_MAX - Aqua.VOLUME_MIN);
    return Math.round(70 + t * 70);
  }

  function fillTankWater(tank, count) {
    const bodies = [];
    const pad = 24;
    const cols = Math.max(10, Math.round(count / 6));
    const rows = Math.ceil(count / cols);
    const usableW = tank.w - pad * 2;
    const usableH = 96;
    let n = 0;
    for (let r = 0; r < rows && n < count; r += 1) {
      for (let c = 0; c < cols && n < count; c += 1) {
        const x = tank.x + pad + (c + 0.5) * (usableW / cols) + (Math.random() - 0.5) * 3;
        const y = tank.y + tank.h - pad - (r + 0.5) * (usableH / rows) + (Math.random() - 0.5) * 2;
        bodies.push(makeWater(x, y));
        n += 1;
      }
    }
    return bodies;
  }

  Aqua.createWorld = function createWorld(engine, params) {
    const L = Aqua.LAYOUT;
    const world = engine.world;
    const composite = Composite.create({ label: "aquaponics" });

    const hole = L.pipeInner;
    const tankReturnOff = L.returnX - L.tank.x - hole / 2;
    const tankPumpOff = L.pump.y - L.tank.y - hole / 2;
    const growInOff = L.dumpX - L.grow.x - hole / 2;
    const growDrainOff = L.drainX - L.grow.x - hole / 2;
    const mechInOff = L.drainX - L.mech.x - hole / 2;
    const mechOutY = L.filterMidY - L.mech.y - hole / 2;
    const bioInY = L.filterMidY - L.bio.y - hole / 2;
    const bioOutOff = L.bioOutX - L.bio.x - hole / 2;

    const glass = { fill: C.glassFill, stroke: C.glass, label: "glass" };
    const steel = { fill: C.steelDark, stroke: C.steel, label: "filter-wall" };

    const structures = [
      ...chamber({
        ...L.grow,
        ...glass,
        label: "grow-wall",
        holes: [
          { side: "top", offset: growInOff, size: hole },
          { side: "bottom", offset: growDrainOff, size: hole },
        ],
      }),
      ...chamber({
        ...L.tank,
        ...glass,
        label: "tank-wall",
        holes: [
          { side: "top", offset: tankReturnOff, size: hole },
          { side: "right", offset: tankPumpOff, size: hole },
        ],
      }),
      ...chamber({
        ...L.mech,
        ...steel,
        label: "mech-wall",
        holes: [
          { side: "top", offset: mechInOff, size: hole },
          { side: "right", offset: mechOutY, size: hole },
        ],
      }),
      ...chamber({
        ...L.bio,
        ...steel,
        label: "bio-wall",
        holes: [
          { side: "left", offset: bioInY, size: hole },
          { side: "bottom", offset: bioOutOff, size: hole },
        ],
      }),
    ];

    const fishLid = wall(L.tank.x + L.tank.w / 2, L.tank.y + 7, L.tank.w - 8, 8, {
      fill: "#0000",
      stroke: "#0000",
      label: "fish-lid",
      visible: false,
      category: CAT.WALL,
      mask: CAT.FISH | CAT.FOOD | CAT.WASTE,
    });

    const copper = { fill: C.copperDark, stroke: C.copper, label: "pipe" };
    const supply = pipeFromCenterline(L.supply, L.pipeInner, L.pipeWall, { ...copper, zone: "supply", strength: 1.15 });
    const drain = pipeFromCenterline(L.drain, L.pipeInner, L.pipeWall, { ...copper, zone: "drain", strength: 0.7 });
    const transfer = pipeFromCenterline(L.transfer, L.pipeInner, L.pipeWall, { ...copper, zone: "transfer", strength: 0.65 });
    const ret = pipeFromCenterline(L.ret, L.pipeInner, L.pipeWall, { ...copper, zone: "return", strength: 0.75 });

    const { impeller, axle } = makeImpeller(L.pump.x, L.pump.y);
    const copperBox = { fill: C.copperDark, stroke: C.copper, label: "pump-housing", chamfer: 3 };
    const housing = [
      wall(L.pump.x, L.pump.y - 26, 56, 8, copperBox),
      wall(L.pump.x, L.pump.y + 26, 56, 8, copperBox),
      wall(L.pump.x - 30, L.pump.y, 6, 40, {
        fill: "#0000",
        stroke: "#0000",
        label: "pump-grate",
        visible: false,
        category: CAT.WALL,
        mask: CAT.FISH | CAT.FOOD,
      }),
      wall(L.tank.right + 12, L.pump.y - hole / 2 - 8, 26, 8, copperBox),
      wall(L.tank.right + 12, L.pump.y + hole / 2 + 8, 26, 8, copperBox),
    ];

    const mechMedia = pinMedia(L.mech.x + L.mech.w * 0.48, L.mech.y + L.mech.h * 0.58, 9, 8, "mech-media", C.mediaMech, 90, 48);
    const bioMedia = pinMedia(L.bio.x + L.bio.w * 0.5, L.bio.y + L.bio.h * 0.55, 14, 7, "bio-media", C.mediaBio, 110, 52);

    const water = fillTankWater(L.tank, targetWaterCount(params.volumeL));

    Composite.add(composite, [
      ...structures,
      fishLid,
      ...supply.bodies,
      ...drain.bodies,
      ...transfer.bodies,
      ...ret.bodies,
      ...housing,
      impeller,
      axle,
      ...mechMedia,
      ...bioMedia,
      ...water,
    ]);
    Composite.add(world, composite);

    const sensors = {
      pipes: [...supply.sensors, ...drain.sensors, ...transfer.sensors, ...ret.sensors],
      intake: {
        min: { x: L.pump.x - 100, y: L.pump.y - 40 },
        max: { x: L.pump.x + 24, y: L.pump.y + 40 },
      },
      grow: {
        min: { x: L.grow.x + 8, y: L.grow.y + 8 },
        max: { x: L.grow.right - 8, y: L.grow.bottom - 8 },
      },
      mech: {
        min: { x: L.mech.x + 8, y: L.mech.y + 8 },
        max: { x: L.mech.right - 8, y: L.mech.bottom - 8 },
      },
      bio: {
        min: { x: L.bio.x + 8, y: L.bio.y + 8 },
        max: { x: L.bio.right - 8, y: L.bio.bottom - 8 },
      },
      tank: {
        min: { x: L.tank.x + 8, y: L.tank.y + 8 },
        max: { x: L.tank.right - 8, y: L.tank.bottom - 8 },
      },
      flux: {
        min: { x: L.riserX - 18, y: L.supplyY + 40 },
        max: { x: L.riserX + 18, y: L.supplyY + 120 },
      },
    };

    const sim = {
      engine,
      world,
      composite,
      impeller,
      water,
      foods: [],
      waste: [],
      bubbles: [],
      fish: [],
      plants: [],
      sensors,
      params,
      flux: 0,
      fluxSmooth: 0.6,
      agitation: 0.2,
      time: 0,
    };

    Aqua.life.spawnFish(sim, params.fishCount);
    Aqua.life.spawnPlants(sim, params.plantCount);

    return sim;
  };

  Aqua.makeWater = makeWater;
  Aqua.targetWaterCount = targetWaterCount;
})(window.Aqua = window.Aqua || {});
