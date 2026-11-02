(function (Aqua) {
  const { Engine, Render, Runner, Composite, Events, Mouse, MouseConstraint } = Matter;

  function copyParams(src) {
    return {
      pumpSpeed: src.pumpSpeed,
      fishCount: src.fishCount,
      volumeL: src.volumeL,
      plantCount: src.plantCount,
      temperature: src.temperature,
    };
  }

  function addMouse(engine, render) {
    const mouse = Mouse.create(render.canvas);
    mouse.pixelRatio = render.options.pixelRatio || 1;
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.18,
        render: { visible: false },
      },
    });
    mouseConstraint.collisionFilter.mask =
      Aqua.CAT.FISH | Aqua.CAT.WATER | Aqua.CAT.FOOD | Aqua.CAT.MEDIA | Aqua.CAT.WASTE;
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;
    Aqua.mouseConstraint = mouseConstraint;
  }

  function boot() {
    const canvas = document.getElementById("world");
    const L = Aqua.LAYOUT;
    Aqua.params = copyParams(Aqua.DEFAULTS);
    Aqua.biology = new Aqua.Biology();
    Aqua.paused = false;
    Aqua.presetName = "established";

    const engine = Engine.create({ enableSleeping: false });
    engine.gravity.x = 0;
    engine.gravity.y = 1;
    engine.gravity.scale = 0.001;
    engine.positionIterations = 10;
    engine.velocityIterations = 8;
    engine.constraintIterations = 3;
    Aqua.engine = engine;

    const render = Render.create({
      canvas,
      engine,
      options: {
        width: L.width,
        height: L.height,
        wireframes: false,
        background: "#07141c",
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        showAngleIndicator: false,
      },
    });
    Aqua.render = render;
    render.canvas.style.width = "100%";
    render.canvas.style.height = "auto";
    Aqua.attachRenderFx(render);

    Aqua.sim = Aqua.createWorld(engine, Aqua.params);
    addMouse(engine, render);

    const runner = Runner.create();
    Aqua.runner = runner;
    Render.run(render);
    Runner.run(runner, engine);

    let lastUi = 0;
    Events.on(engine, "beforeUpdate", () => {
      if (Aqua.paused || !Aqua.sim) return;
      const dt = Math.min(runner.delta || 16.666, 32) / 1000;
      Aqua.flow.applyFlow(Aqua.sim, dt);
      const snap = Aqua.biology.snapshot();
      Aqua.life.updateFish(Aqua.sim, dt, snap);
      Aqua.life.updatePlants(Aqua.sim, dt, snap);
      Aqua.life.updateLoose(Aqua.sim, dt);
      Aqua.biology.step(dt, Aqua.sim.signalsCache);
    });

    Events.on(engine, "collisionStart", (evt) => {
      if (Aqua.sim) Aqua.life.onCollision(Aqua.sim, evt);
    });

    Events.on(engine, "afterUpdate", () => {
      const now = performance.now();
      if (now - lastUi > 120 && Aqua.sim) {
        lastUi = now;
        Aqua.ui.update(Aqua.biology.snapshot(), Aqua.sim);
      }
    });

    Aqua.ui.init();
    Aqua.biology.reset("established", Aqua.params);
    Aqua.ui.update(Aqua.biology.snapshot(), Aqua.sim);
  }

  Aqua.togglePause = function () {
    Aqua.paused = !Aqua.paused;
    if (Aqua.paused) Runner.stop(Aqua.runner);
    else Runner.run(Aqua.runner, Aqua.engine);
    Aqua.ui.setPaused(Aqua.paused);
  };

  Aqua.feed = function () {
    if (!Aqua.sim) return;
    Aqua.life.spawnFood(Aqua.sim, 8);
    Aqua.biology.feed();
  };

  Aqua.restart = function () {
    const keepPause = Aqua.paused;
    Composite.clear(Aqua.engine.world, false);
    Engine.clear(Aqua.engine);
    Aqua.engine.world.gravity.y = 1;
    Aqua.sim = Aqua.createWorld(Aqua.engine, Aqua.params);
    addMouse(Aqua.engine, Aqua.render);
    Aqua.biology.reset(Aqua.presetName, Aqua.params);
    if (keepPause) {
      Aqua.paused = false;
      Aqua.togglePause();
    }
    Aqua.ui.syncParams();
    Aqua.ui.update(Aqua.biology.snapshot(), Aqua.sim);
  };

  Aqua.loadPreset = function (name) {
    const preset = Aqua.PRESETS[name] || Aqua.PRESETS.established;
    Aqua.presetName = name;
    Aqua.params = copyParams(preset.params);
    Aqua.ui.syncParams();
    Aqua.restart();
  };

  window.addEventListener("DOMContentLoaded", boot);
})(window.Aqua = window.Aqua || {});
