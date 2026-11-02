(function (Aqua) {
  const { Bodies, Body, Composite, Constraint } = Matter;
  const CAT = Aqua.CAT;
  const C = Aqua.COLORS;

  function cancelGravity(engine, body) {
    const g = engine.gravity;
    Body.applyForce(body, body.position, {
      x: -g.x * g.scale * body.mass,
      y: -g.y * g.scale * body.mass,
    });
  }

  function createFishBody(x, y, color) {
    const body = Bodies.circle(x, y, 12, {
      label: "fish",
      frictionAir: 0.15,
      density: 0.0012,
      restitution: 0.12,
      collisionFilter: {
        category: CAT.FISH,
        mask: CAT.WALL | CAT.FISH | CAT.FOOD | CAT.PLANT,
      },
      render: { fillStyle: color, strokeStyle: "rgba(255,255,255,0.2)", lineWidth: 1 },
    });
    Body.setInertia(body, Math.max(body.inertia, 1) * 120);
    body.plugin = { kind: "fish" };
    return { body };
  }

  function spawnOneFish(sim) {
    const L = Aqua.LAYOUT;
    const x = L.tank.x + 70 + Math.random() * (L.tank.w - 260);
    const y = L.tank.y + 80 + Math.random() * (L.tank.h - 150);
    const color = C.fish[sim.fish.length % C.fish.length];
    const parts = createFishBody(x, y, color);
    const agent = {
      ...parts,
      color,
      heading: Math.random() > 0.5 ? 0 : Math.PI,
      health: 0.9 + Math.random() * 0.1,
      hunger: Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      alive: true,
    };
    Composite.add(sim.composite, parts.body);
    sim.fish.push(agent);
    return agent;
  }

  function removeFish(sim, agent) {
    agent.alive = false;
    Composite.remove(sim.composite, agent.body);
    sim.fish = sim.fish.filter((f) => f !== agent);
  }

  function spawnOnePlant(sim, x) {
    const L = Aqua.LAYOUT;
    const baseY = L.grow.bottom - 8;
    const stem = Bodies.rectangle(x, baseY - 22, 6, 32, {
      label: "plant",
      frictionAir: 0.22,
      density: 0.0005,
      restitution: 0.02,
      collisionFilter: {
        category: CAT.PLANT,
        mask: CAT.WALL | CAT.WATER | CAT.FISH,
      },
      render: { fillStyle: C.stem, strokeStyle: "rgba(180,255,160,0.2)", lineWidth: 1 },
    });
    const pin = Constraint.create({
      bodyA: stem,
      pointA: { x: 0, y: 14 },
      pointB: { x, y: baseY - 6 },
      length: 0,
      stiffness: 0.95,
      damping: 0.28,
      render: { strokeStyle: "rgba(116,193,90,0.35)", lineWidth: 2 },
    });
    const stay = Constraint.create({
      bodyA: stem,
      pointA: { x: 0, y: -12 },
      pointB: { x, y: baseY - 40 },
      length: 0,
      stiffness: 0.55,
      damping: 0.2,
      render: { visible: false },
    });
    const plant = {
      stem,
      pin,
      stay,
      x,
      growth: 0.45 + Math.random() * 0.25,
      sway: Math.random() * Math.PI * 2,
    };
    Composite.add(sim.composite, [stem, pin, stay]);
    sim.plants.push(plant);
    return plant;
  }

  function syncFish(sim, count) {
    count = Math.max(Aqua.FISH_MIN, Math.min(Aqua.FISH_MAX, count | 0));
    while (sim.fish.length < count) spawnOneFish(sim);
    while (sim.fish.length > count) removeFish(sim, sim.fish[sim.fish.length - 1]);
  }

  function syncPlants(sim, count) {
    const L = Aqua.LAYOUT;
    count = Math.max(Aqua.PLANT_MIN, Math.min(Aqua.PLANT_MAX, count | 0));
    while (sim.plants.length > count) {
      const p = sim.plants.pop();
      Composite.remove(sim.composite, p.pin);
      if (p.stay) Composite.remove(sim.composite, p.stay);
      Composite.remove(sim.composite, p.stem);
    }
    while (sim.plants.length < count) {
      const n = sim.plants.length;
      const x = L.grow.x + 46 + n * ((L.grow.w - 110) / Math.max(count - 1, 1));
      spawnOnePlant(sim, x);
    }
    const span = L.grow.w - 110;
    sim.plants.forEach((p, i) => {
      p.x = L.grow.x + 46 + i * (span / Math.max(sim.plants.length - 1, 1));
      p.pin.pointB.x = p.x;
      if (p.stay) p.stay.pointB.x = p.x;
    });
  }

  function spawnFood(sim, n) {
    const L = Aqua.LAYOUT;
    for (let i = 0; i < n; i += 1) {
      const x = L.tank.x + 80 + Math.random() * (L.tank.w - 200);
      const y = L.tank.y + 24 + Math.random() * 18;
      const pellet = Bodies.circle(x, y, 4.2, {
        label: "food",
        density: 0.001,
        frictionAir: 0.02,
        restitution: 0.1,
        collisionFilter: {
          category: CAT.FOOD,
          mask: CAT.WALL | CAT.FISH | CAT.MEDIA | CAT.WATER | CAT.FOOD,
        },
        render: { fillStyle: C.food, strokeStyle: "#fff6", lineWidth: 1 },
      });
      pellet.plugin = { kind: "food", age: 0 };
      Composite.add(sim.composite, pellet);
      sim.foods.push(pellet);
    }
  }

  function spawnWaste(sim, x, y) {
    const flake = Bodies.circle(x, y, 3.6, {
      label: "waste",
      density: 0.0013,
      frictionAir: 0.03,
      friction: 0.08,
      collisionFilter: {
        category: CAT.WASTE,
        mask: CAT.WALL | CAT.WATER | CAT.MEDIA | CAT.IMPELLER | CAT.WASTE,
      },
      render: { fillStyle: C.waste, strokeStyle: "#0003", lineWidth: 1 },
    });
    flake.plugin = { kind: "waste", age: 0, captured: false };
    Composite.add(sim.composite, flake);
    sim.waste.push(flake);
  }

  function spawnBubble(sim) {
    const L = Aqua.LAYOUT;
    const pump = sim.params.pumpSpeed;
    if (pump < 0.05 || Math.random() > pump * 0.4) return;
    const b = Bodies.circle(L.pump.x - 30 + Math.random() * 18, L.pump.y + 8, 2.4 + Math.random() * 1.6, {
      label: "bubble",
      isSensor: true,
      frictionAir: 0.02,
      collisionFilter: { category: CAT.SENSOR, mask: 0 },
      render: { fillStyle: "rgba(190,230,255,0.4)", strokeStyle: "rgba(255,255,255,0.2)", lineWidth: 1 },
    });
    b.plugin = { kind: "bubble", life: 1.6 + Math.random() };
    Composite.add(sim.composite, b);
    sim.bubbles.push(b);
  }

  function nearestFood(foods, pos) {
    let best = null;
    let bestD = 90;
    for (const f of foods) {
      const d = Math.hypot(f.position.x - pos.x, f.position.y - pos.y);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    return best;
  }

  function updateFish(sim, dt, bio) {
    const L = Aqua.LAYOUT;
    const tank = L.tank;
    sim.time += dt;

    for (const fish of sim.fish.slice()) {
      if (!fish.alive) continue;
      const b = fish.body;
      const pos = b.position;
      fish.phase += dt * 3;
      fish.hunger = Math.min(1, fish.hunger + dt * 0.04);
      fish.health += (bio.health - fish.health) * Math.min(1, dt * 0.35);
      fish.stress = (fish.stress || 0) + (fish.health < 0.12 ? dt : -dt * 0.5);
      fish.stress = Math.max(0, fish.stress);

      cancelGravity(sim.engine, b);
      Body.setAngularVelocity(b, 0);

      let sx = 0;
      let sy = 0;
      sx += Math.cos(fish.phase) * 0.35;
      sy += Math.sin(fish.phase * 0.55) * 0.18;

      const food = nearestFood(sim.foods, pos);
      if (food) {
        sx += (food.position.x - pos.x) * 0.03;
        sy += (food.position.y - pos.y) * 0.03;
      }

      const m = 40;
      if (pos.x < tank.x + m) sx += 1.8;
      if (pos.x > tank.right - 110) sx -= 1.8;
      if (pos.y < tank.y + 56) sy += 1.6;
      if (pos.y > tank.bottom - m) sy -= 1.8;

      for (const other of sim.fish) {
        if (other === fish || !other.alive) continue;
        const dx = pos.x - other.body.position.x;
        const dy = pos.y - other.body.position.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 42) {
          sx += dx / d;
          sy += dy / d;
        }
      }

      const vigor = 0.35 + fish.health * 0.65;
      const mag = 0.00028 * vigor;
      Body.applyForce(b, pos, { x: sx * mag * b.mass, y: sy * mag * b.mass });

      const v = b.velocity;
      const spd = Math.hypot(v.x, v.y);
      if (spd > 1.6) Body.setVelocity(b, { x: (v.x / spd) * 1.6, y: (v.y / spd) * 1.6 });
      if (spd > 0.12) {
        const want = Math.atan2(v.y, v.x);
        let diff = want - fish.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        fish.heading += diff * Math.min(1, dt * 4);
      }
      Body.setAngle(b, fish.heading);

      const fill = fish.health > 0.45 ? fish.color : `rgba(150, 148, 140, ${0.4 + fish.health})`;
      b.render.fillStyle = fill;

      if (Math.random() < dt * 0.15 * (0.4 + fish.hunger)) {
        spawnWaste(sim, pos.x, pos.y + 10);
      }

      if (fish.health < 0.08 && fish.stress > 8) {
        spawnWaste(sim, pos.x, pos.y);
        spawnWaste(sim, pos.x + 6, pos.y);
        removeFish(sim, fish);
        sim.params.fishCount = sim.fish.length;
      }
    }
  }

  function updatePlants(sim, dt, bio) {
    const target = 0.35 + Math.min(1.1, bio.plantBiomass / 10);
    for (const plant of sim.plants) {
      plant.growth += (target - plant.growth) * Math.min(1, dt * 0.4);
      plant.sway += dt * 2;
      cancelGravity(sim.engine, plant.stem);
      const flowNudge = (sim.fluxSmooth - 0.4) * 0.000006;
      Body.applyForce(plant.stem, plant.stem.position, {
        x: flowNudge * plant.stem.mass + Math.sin(plant.sway) * 0.0000015,
        y: 0,
      });
      Body.setAngularVelocity(plant.stem, plant.stem.angularVelocity * 0.85);
    }
  }

  function updateLoose(sim, dt) {
    const L = Aqua.LAYOUT;
    for (const food of sim.foods.slice()) {
      food.plugin.age += dt;
      if (food.plugin.age > 18 || food.position.y > L.height + 20) {
        Composite.remove(sim.composite, food);
        sim.foods = sim.foods.filter((f) => f !== food);
      }
    }
    for (const w of sim.waste.slice()) {
      w.plugin.age += dt;
      if (w.plugin.age > 40 || sim.waste.length > 28) {
        Composite.remove(sim.composite, w);
        sim.waste = sim.waste.filter((item) => item !== w);
      }
    }
    for (const b of sim.bubbles.slice()) {
      b.plugin.life -= dt;
      cancelGravity(sim.engine, b);
      Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.000002, y: -0.00005 });
      if (b.plugin.life <= 0 || b.position.y < L.tank.y + 12) {
        Composite.remove(sim.composite, b);
        sim.bubbles = sim.bubbles.filter((item) => item !== b);
      }
    }
    if (sim.bubbles.length < 18) spawnBubble(sim);
  }

  function onCollision(sim, evt) {
    for (const pair of evt.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const labels = [a.label, b.label];
      const food = a.label === "food" ? a : b.label === "food" ? b : null;
      const fishHit = labels.includes("fish");
      if (food && fishHit) {
        Composite.remove(sim.composite, food);
        sim.foods = sim.foods.filter((f) => f !== food);
        const agent = sim.fish.find((f) => f.body === a || f.body === b);
        if (agent) {
          agent.hunger = Math.max(0, agent.hunger - 0.45);
          agent.health = Math.min(1, agent.health + 0.04);
        }
        Aqua.biology.ammonia += 0.05;
      }

      const waste = a.label === "waste" ? a : b.label === "waste" ? b : null;
      const media = a.label === "mech-media" ? a : b.label === "mech-media" ? b : null;
      if (waste && media && waste.plugin && !waste.plugin.captured) {
        waste.plugin.captured = true;
        Composite.add(
          sim.composite,
          Constraint.create({
            bodyA: waste,
            bodyB: media,
            length: 9,
            stiffness: 0.12,
            damping: 0.18,
            render: { visible: false },
          })
        );
        Aqua.biology.addSolids(0.35);
      }
    }
  }

  Aqua.life = {
    spawnFish: syncFish,
    spawnPlants: syncPlants,
    spawnFood,
    spawnWaste,
    updateFish,
    updatePlants,
    updateLoose,
    onCollision,
    syncFish,
    syncPlants,
  };
})(window.Aqua = window.Aqua || {});
