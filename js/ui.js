(function (Aqua) {
  const $ = (id) => document.getElementById(id);

  function fmt(v, d) {
    return v.toFixed(d);
  }

  function setBar(id, t, tone) {
    const el = $(id);
    if (!el) return;
    el.style.width = `${Math.max(2, Math.min(100, t * 100))}%`;
    el.dataset.tone = tone || "ok";
  }

  function toneFor(value, warn, danger, invert) {
    if (invert) {
      if (value < danger) return "danger";
      if (value < warn) return "warn";
      return "ok";
    }
    if (value > danger) return "danger";
    if (value > warn) return "warn";
    return "ok";
  }

  function bindSlider(id, key, paint) {
    const el = $(id);
    const out = $(`${id}-val`);
    el.addEventListener("input", () => {
      const v = Number(el.value);
      Aqua.params[key] = v;
      if (out) paint(out, v);
      if (key === "fishCount") Aqua.life.syncFish(Aqua.sim, v);
      if (key === "plantCount") Aqua.life.syncPlants(Aqua.sim, v);
      if (key === "volumeL") Aqua.flow.syncWater(Aqua.sim);
    });
  }

  function writeParamLabels() {
    $("pump-val").textContent = `${Math.round(Aqua.params.pumpSpeed * 100)}%`;
    $("fish-val").textContent = String(Aqua.params.fishCount);
    $("volume-val").textContent = `${Math.round(Aqua.params.volumeL)} L`;
    $("plant-val").textContent = String(Aqua.params.plantCount);
    $("temp-val").textContent = `${fmt(Aqua.params.temperature, 1)} °C`;
    $("pump").value = Aqua.params.pumpSpeed;
    $("fish").value = Aqua.params.fishCount;
    $("volume").value = Aqua.params.volumeL;
    $("plants").value = Aqua.params.plantCount;
    $("temp").value = Aqua.params.temperature;
  }

  Aqua.ui = {
    init() {
      bindSlider("pump", "pumpSpeed", (out, v) => {
        out.textContent = `${Math.round(v * 100)}%`;
      });
      bindSlider("fish", "fishCount", (out, v) => {
        out.textContent = String(Math.round(v));
      });
      bindSlider("volume", "volumeL", (out, v) => {
        out.textContent = `${Math.round(v)} L`;
      });
      bindSlider("plants", "plantCount", (out, v) => {
        out.textContent = String(Math.round(v));
      });
      bindSlider("temp", "temperature", (out, v) => {
        out.textContent = `${fmt(v, 1)} °C`;
      });

      $("btn-pause").addEventListener("click", () => Aqua.togglePause());
      $("btn-reset").addEventListener("click", () => Aqua.restart());
      $("btn-feed").addEventListener("click", () => Aqua.feed());
      $("preset").addEventListener("change", (e) => Aqua.loadPreset(e.target.value));

      document.addEventListener("keydown", (e) => {
        if (e.target.matches("input, select, textarea")) return;
        if (e.code === "Space") {
          e.preventDefault();
          Aqua.togglePause();
        } else if (e.key === "r" || e.key === "R") Aqua.restart();
        else if (e.key === "f" || e.key === "F") Aqua.feed();
      });

      writeParamLabels();
    },

    syncParams: writeParamLabels,

    update(bio, sim) {
      $("v-nh3").textContent = `${fmt(bio.ammonia, 2)} mg/L`;
      $("v-no2").textContent = `${fmt(bio.nitrite, 2)} mg/L`;
      $("v-no3").textContent = `${fmt(bio.nitrate, 1)} mg/L`;
      $("v-o2").textContent = `${fmt(bio.oxygen, 1)} mg/L`;
      $("v-temp").textContent = `${fmt(sim.params.temperature, 1)} °C`;
      $("v-ph").textContent = fmt(bio.ph, 2);
      $("v-health").textContent = `${Math.round(bio.health * 100)}%`;
      $("v-eff").textContent = `${Math.round(bio.efficiency)}%`;
      $("v-flow").textContent = `${Math.round(80 + sim.fluxSmooth * 920)} L/h`;
      $("v-solids").textContent = `${fmt(bio.solids, 1)} g`;
      $("v-bact").textContent = `${Math.round(((bio.bacteriaA + bio.bacteriaB) / 2) * 100)}%`;

      setBar("bar-nh3", bio.ammonia / 2, toneFor(bio.ammonia, 0.4, 1.0));
      setBar("bar-no2", bio.nitrite / 1.5, toneFor(bio.nitrite, 0.25, 0.7));
      setBar("bar-no3", bio.nitrate / 80, toneFor(bio.nitrate, 90, 130));
      setBar("bar-o2", bio.oxygen / 10, toneFor(bio.oxygen, 5, 3.5, true));
      setBar("bar-health", bio.health, toneFor(bio.health, 0.55, 0.35, true));
      setBar("bar-eff", bio.efficiency / 100, bio.efficiency > 75 ? "ok" : bio.efficiency > 45 ? "warn" : "danger");

      const a = bio.assess;
      const banner = $("status-banner");
      banner.dataset.level = a.level;
      $("status-title").textContent = a.title;
      $("status-note").textContent = a.note;

      $("cycle-a").style.opacity = String(0.25 + Math.min(1, bio.rates.waste * 80) * 0.75);
      $("cycle-b").style.opacity = String(0.25 + Math.min(1, bio.rates.nitrosomonas * 8) * 0.75);
      $("cycle-c").style.opacity = String(0.25 + Math.min(1, bio.rates.nitrobacter * 8) * 0.75);
      $("cycle-d").style.opacity = String(0.25 + Math.min(1, bio.rates.uptake * 6) * 0.75);

      $("fish").value = sim.params.fishCount;
      $("fish-val").textContent = String(sim.params.fishCount);
    },

    setPaused(paused) {
      $("btn-pause").textContent = paused ? "Resume" : "Pause";
      $("btn-pause").setAttribute("aria-pressed", String(paused));
      document.body.classList.toggle("is-paused", paused);
    },
  };
})(window.Aqua = window.Aqua || {});
