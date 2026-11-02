(function (Aqua) {
  const L = () => Aqua.LAYOUT;

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function waterColor(bio) {
    const murk = Math.min(1, bio.ammonia / 2.2 + bio.solids / 70);
    const r = Math.round(18 + murk * 90);
    const g = Math.round(72 - murk * 20);
    const b = Math.round(92 - murk * 40);
    const a = 0.2 + murk * 0.12;
    return `rgba(${r},${g},${b},${a})`;
  }

  function drawVeil(ctx, box, color, fillFrac) {
    const h = box.h * fillFrac;
    const y = box.y + box.h - h;
    ctx.fillStyle = color;
    ctx.fillRect(box.x + 6, y, box.w - 12, h - 6);
    ctx.fillStyle = "rgba(190, 240, 255, 0.07)";
    ctx.fillRect(box.x + 6, y, box.w - 12, 3);
  }

  function drawLabel(ctx, text, x, y) {
    ctx.font = "600 11px 'Sora', sans-serif";
    const w = ctx.measureText(text).width + 16;
    roundRect(ctx, x - w / 2, y - 9, w, 18, 9);
    ctx.fillStyle = "rgba(6, 18, 24, 0.62)";
    ctx.fill();
    ctx.strokeStyle = "rgba(160, 220, 214, 0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#d7f3ee";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 0.5);
  }

  function drawGlass(ctx, box) {
    ctx.strokeStyle = "rgba(180, 230, 240, 0.22)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, box.x - 2, box.y - 2, box.w + 4, box.h + 4, 8);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(box.x + 10, box.y + 12);
    ctx.lineTo(box.x + 10, box.y + box.h - 14);
    ctx.stroke();
  }

  function drawPlants(ctx, sim) {
    for (const plant of sim.plants) {
      const s = plant.stem;
      const x = s.position.x;
      const y = s.position.y;
      const a = s.angle;
      const g = plant.growth;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      for (let i = 0; i < 5; i += 1) {
        const along = -10 - i * (7 + g * 6);
        const side = (i % 2 === 0 ? -1 : 1) * (7 + g * 8);
        const rw = 7 + g * 9;
        const rh = 4 + g * 4;
        ctx.fillStyle = i % 2 ? "rgba(98, 186, 86, 0.85)" : "rgba(142, 214, 108, 0.88)";
        ctx.beginPath();
        ctx.ellipse(side, along, rw, rh, side > 0 ? -0.5 : 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawFishEyes(ctx, sim) {
    for (const fish of sim.fish) {
      if (!fish.alive) continue;
      const p = fish.body.position;
      const a = fish.heading || fish.body.angle;
      const wag = Math.sin(sim.time * 8 + (fish.phase || 0)) * 0.35;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.fillStyle = fish.color;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-22, -8 + wag * 4);
      ctx.lineTo(-17, 0);
      ctx.lineTo(-22, 8 + wag * 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1, 0, 13, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f7fbff";
      ctx.beginPath();
      ctx.arc(7, -2.6, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#152028";
      ctx.beginPath();
      ctx.arc(7.6, -2.6, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCaustics(ctx, box, t, frac) {
    const y = box.y + box.h * (1 - frac);
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x + 6, y, box.w - 12, 16);
    ctx.clip();
    ctx.strokeStyle = "rgba(170, 230, 240, 0.16)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      for (let x = box.x; x < box.x + box.w; x += 8) {
        const yy = y + 6 + Math.sin(x * 0.04 + t * 1.4 + i) * 3 + Math.sin(x * 0.01 - t + i);
        if (x === box.x) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBiofilm(ctx, sim, bio) {
    const maturity = (bio.bacteriaA + bio.bacteriaB) * 0.5;
    for (const body of sim.composite.bodies) {
      if (body.label !== "bio-media") continue;
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, body.circleRadius + 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(214, 154, 74, ${0.08 + maturity * 0.28})`;
      ctx.fill();
    }
  }

  function paint(render, phase) {
    const ctx = render.context;
    const sim = Aqua.sim;
    if (!sim || !Aqua.biology) return;
    const bio = Aqua.biology.snapshot();
    const layout = L();
    const t = sim.time;
    const vol = (sim.params.volumeL - Aqua.VOLUME_MIN) / (Aqua.VOLUME_MAX - Aqua.VOLUME_MIN);
    const tankFill = 0.38 + vol * 0.42;
    const growFill = 0.28 + sim.fluxSmooth * 0.2;
    const tint = waterColor(bio);

    ctx.save();
    if (phase === "before") {
      drawVeil(ctx, layout.tank, tint, tankFill);
      drawVeil(ctx, layout.grow, tint, growFill);
      drawVeil(ctx, layout.mech, "rgba(62, 78, 72, 0.45)", 1);
      drawVeil(ctx, layout.bio, "rgba(48, 86, 70, 0.42)", 1);
      drawCaustics(ctx, layout.tank, t, tankFill);
    } else {
      drawGlass(ctx, layout.tank);
      drawGlass(ctx, layout.grow);
      drawGlass(ctx, layout.mech);
      drawGlass(ctx, layout.bio);
      drawPlants(ctx, sim);
      drawFishEyes(ctx, sim);
      drawBiofilm(ctx, sim, bio);
      drawLabel(ctx, "GROW BED", layout.grow.x + layout.grow.w / 2, layout.grow.y + 16);
      drawLabel(ctx, "FISH TANK", layout.tank.x + 90, layout.tank.y + 22);
      drawLabel(ctx, "MECH FILTER", layout.mech.x + layout.mech.w / 2, layout.mech.y + 16);
      drawLabel(ctx, "BIO FILTER", layout.bio.x + layout.bio.w / 2, layout.bio.y + 16);
      drawLabel(ctx, "PUMP", layout.pump.x, layout.pump.y - 42);
    }
    ctx.restore();
  }

  Aqua.attachRenderFx = function (render) {
    Matter.Events.on(render, "beforeRender", () => paint(render, "before"));
    Matter.Events.on(render, "afterRender", () => paint(render, "after"));
  };
})(window.Aqua = window.Aqua || {});
