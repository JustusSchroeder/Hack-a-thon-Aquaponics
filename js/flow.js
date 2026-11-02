(function (Aqua) {
  const { Body, Composite, Query } = Matter;

  function inBounds(body, box) {
    const p = body.position;
    return p.x > box.min.x && p.x < box.max.x && p.y > box.min.y && p.y < box.max.y;
  }

  function countIn(list, box) {
    let n = 0;
    for (const b of list) if (inBounds(b, box)) n += 1;
    return n;
  }

  function capSpeed(p, max) {
    const v = p.velocity;
    const spd = Math.hypot(v.x, v.y);
    if (spd > max) Body.setVelocity(p, { x: (v.x / spd) * max, y: (v.y / spd) * max });
  }

  function syncWater(sim) {
    const target = Aqua.targetWaterCount(sim.params.volumeL);
    const L = Aqua.LAYOUT;
    while (sim.water.length < target) {
      const x = L.tank.x + 40 + Math.random() * (L.tank.w - 140);
      const y = L.tank.y + 90 + Math.random() * 80;
      const drop = Aqua.makeWater(x, y);
      Composite.add(sim.composite, drop);
      sim.water.push(drop);
    }
    while (sim.water.length > target) {
      const drop = sim.water.pop();
      Composite.remove(sim.composite, drop);
    }
  }

  function applyFlow(sim, dt) {
    const pump = sim.params.pumpSpeed;
    const impeller = sim.impeller;
    const water = sim.water;
    const L = Aqua.LAYOUT;

    Body.setAngularVelocity(impeller, pump * 0.25);

    const intake = Query.region(water, sim.sensors.intake);
    for (const p of intake) {
      Body.applyForce(p, p.position, { x: 0.0009 * pump * p.mass, y: 0 });
    }

    let fluxHits = 0;
    for (const seg of sim.sensors.pipes) {
      const found = Query.region(water, seg.bounds);
      const rising = seg.dir.y < -0.5;
      const falling = seg.dir.y > 0.5;
      let along = 0.00032 * (0.3 + pump * 0.7) * seg.strength;
      if (seg.zone === "supply") along = 0.0007 * pump * seg.strength;
      if (rising) along = 0.0009 * pump * seg.strength;
      if (falling) along = 0.0001 * seg.strength;
      for (const p of found) {
        Body.applyForce(p, p.position, {
          x: seg.dir.x * along * p.mass,
          y: seg.dir.y * along * p.mass + (rising ? -0.0022 * pump * p.mass : 0),
        });
        capSpeed(p, rising ? 2.1 : 1.7);
        p.plugin.zone = seg.zone;
      }
    }

    for (const p of Query.region(water, sim.sensors.flux)) {
      if (p.velocity.y < -0.25) fluxHits += 1;
    }
    sim.flux = fluxHits;
    sim.fluxSmooth += (Math.min(1.2, fluxHits / 5 + pump * 0.45) - sim.fluxSmooth) * Math.min(1, dt * 2);

    for (const p of Query.region(water, sim.sensors.grow)) {
      Body.applyForce(p, p.position, { x: 0.00022 * p.mass, y: 0 });
      capSpeed(p, 1.6);
      p.plugin.zone = "grow";
    }
    for (const p of Query.region(water, sim.sensors.mech)) {
      Body.applyForce(p, p.position, { x: 0.00018 * p.mass, y: 0 });
      capSpeed(p, 1.5);
      p.plugin.zone = "mech";
    }
    for (const p of Query.region(water, sim.sensors.bio)) {
      Body.applyForce(p, p.position, { x: 0, y: 0.00008 * p.mass });
      p.plugin.zone = "bio";
    }

    sim.agitation = Math.min(1, intake.length / 10 + pump * 0.4);

    for (const p of water) {
      capSpeed(p, 3.2);
      const out =
        p.position.x < -60 ||
        p.position.x > L.width + 60 ||
        p.position.y < -60 ||
        p.position.y > L.height + 60;
      if (out) {
        Body.setPosition(p, { x: L.tank.x + 100 + Math.random() * 160, y: L.tank.y + 70 });
        Body.setVelocity(p, { x: 0, y: 0 });
      }
    }

    sim.signalsCache = {
      bioContact: Math.min(1, countIn(water, sim.sensors.bio) / 6 + sim.fluxSmooth * 0.35),
      mechContact: Math.min(1, countIn(water, sim.sensors.mech) / 5 + sim.fluxSmooth * 0.3),
      flow01: sim.fluxSmooth,
      plantBiomass: Aqua.biology.plantBiomass,
      fishBiomass: sim.fish.length * 0.85,
      temperature: sim.params.temperature,
      volumeL: sim.params.volumeL,
      pumpSpeed: pump,
      agitation: sim.agitation,
    };
  }

  Aqua.flow = { applyFlow, syncWater, countIn };
})(window.Aqua = window.Aqua || {});
