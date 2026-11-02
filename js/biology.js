(function (Aqua) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function tempCurve(t, opt, width) {
    const d = (t - opt) / width;
    return Math.exp(-d * d);
  }

  class Biology {
    constructor() {
      this.time = 0;
      this.feedPulse = 0;
      this.rates = { nitrosomonas: 0, nitrobacter: 0, uptake: 0, waste: 0, aeration: 0 };
      this.reset("established", { ...Aqua.DEFAULTS });
    }

    reset(presetName, params) {
      const preset = Aqua.PRESETS[presetName] || Aqua.PRESETS.established;
      const w = preset.water;
      this.preset = presetName;
      this.ammonia = w.ammonia;
      this.nitrite = w.nitrite;
      this.nitrate = w.nitrate;
      this.oxygen = w.oxygen;
      this.ph = w.ph;
      this.bacteriaA = w.bacteriaA;
      this.bacteriaB = w.bacteriaB;
      this.solids = w.solids;
      this.plantBiomass = (params.plantCount || preset.params.plantCount) * 0.55;
      this.efficiency = 72;
      this.time = 0;
      this.feedPulse = 0;
      this.health = 0.92;
    }

    feed() {
      this.feedPulse = Math.min(1, this.feedPulse + 0.55);
    }

    addSolids(g) {
      this.solids = clamp(this.solids + g, 0, 80);
    }

    step(dt, sig) {
      dt = Math.min(dt, 0.05);
      this.time += dt;
      this.feedPulse *= Math.exp(-dt * 0.25);

      const volume = Math.max(120, sig.volumeL);
      const volF = 400 / volume;
      const temp = sig.temperature;
      const fish = Math.max(0, sig.fishBiomass);
      const plants = Math.max(0.2, sig.plantBiomass);
      const flow = clamp(sig.flow01, 0, 1.2);
      const bioC = clamp(sig.bioContact, 0.03, 1);
      const mechC = clamp(sig.mechContact, 0.03, 1);

      const o2sat = clamp(14.6 - 0.38 * temp + 0.004 * temp * temp, 6.5, 12.5);
      const nitTemp = tempCurve(temp, 28, 8);
      const plantTemp = tempCurve(temp, 24, 10);
      const fishTemp = tempCurve(temp, 27, 7);
      const o2f = this.oxygen / (this.oxygen + 1.6);

      const feedFactor = 0.35 + this.feedPulse * 1.1;
      const tanOut = fish * feedFactor * 0.007 * volF;
      this.ammonia += tanOut * dt;
      this.rates.waste = tanOut;

      this.ammonia += this.solids * 0.00035 * (1.15 - mechC) * dt;
      this.solids = Math.max(0, this.solids - mechC * 0.08 * dt);

      const nh3frac = 1 / (1 + Math.pow(10, 9.3 - this.ph));
      const unionized = this.ammonia * nh3frac;

      const convA = this.bacteriaA * bioC * nitTemp * o2f * this.ammonia * (0.22 + flow * 0.35);
      const convB = this.bacteriaB * bioC * nitTemp * o2f * this.nitrite * (0.18 + flow * 0.32);
      this.ammonia = Math.max(0, this.ammonia - convA * dt);
      this.nitrite = Math.max(0, this.nitrite + (convA - convB) * dt);
      this.nitrate += convB * dt;
      this.rates.nitrosomonas = convA;
      this.rates.nitrobacter = convB;

      this.oxygen -= (convA * 0.35 + convB * 0.12) * dt;
      this.oxygen -= fish * 0.018 * dt;
      this.ph -= convA * 0.012 * dt;

      const uptake = plants * plantTemp * (this.nitrate / (this.nitrate + 14)) * (0.01 + flow * 0.008);
      this.nitrate = Math.max(0, this.nitrate - uptake * dt);
      this.plantBiomass = clamp(this.plantBiomass + (uptake * 0.08 - 0.012) * dt, 0.35, 18);
      this.oxygen += plants * plantTemp * 0.035 * dt;
      this.ph += uptake * 0.01 * dt;
      this.rates.uptake = uptake;

      const kla = 0.08 + sig.pumpSpeed * 0.22 + flow * 0.12 + sig.agitation * 0.08;
      const aer = kla * (o2sat - this.oxygen);
      this.oxygen += aer * dt * 0.12;
      this.rates.aeration = aer;

      this.bacteriaA = clamp(this.bacteriaA + (convA * 0.15 - 0.01) * dt, 0.04, 1);
      this.bacteriaB = clamp(this.bacteriaB + (convB * 0.16 - 0.009) * dt, 0.03, 1);
      if (flow < 0.1) this.oxygen -= 0.15 * dt;

      this.ph = clamp(lerp(this.ph, 6.9, 0.04 * dt), 6.2, 8.2);
      this.ammonia = clamp(this.ammonia, 0, 8);
      this.nitrite = clamp(this.nitrite, 0, 6);
      this.nitrate = clamp(this.nitrate, 0, 160);
      this.oxygen = clamp(this.oxygen, 0.4, 12);

      const nh3Dmg = unionized * 5 + Math.max(0, this.ammonia - 0.6) * 0.05;
      const no2Dmg = Math.max(0, this.nitrite - 0.25) * 0.12;
      const hypoxia = Math.max(0, 4.2 - this.oxygen) * 0.1;
      const crowding = Math.max(0, fish - volume / 45) * 0.02;
      const tempStress = Math.abs(temp - 27) * 0.008;
      const damage = nh3Dmg + no2Dmg + hypoxia + crowding + tempStress;
      const recover = this.oxygen > 5.5 && this.ammonia < 0.4 && this.nitrite < 0.3 ? 0.1 * fishTemp : 0.03;
      this.health = clamp(this.health + (recover - damage) * dt, 0.05, 1);

      const nIn = Math.max(tanOut, 1e-6);
      const loop = clamp(uptake / nIn, 0, 1.4);
      this.efficiency = clamp(
        100 * (0.45 * loop + 0.2 * clamp(flow, 0, 1) + 0.2 * this.health + 0.15 * clamp(this.oxygen / 7, 0, 1.1)),
        0,
        100
      );
      this.plantGrowth = uptake * plantTemp;
      this.o2sat = o2sat;
    }

    assess() {
      if (this.oxygen < 3.5) return { level: "danger", title: "Hypoxia", note: "Dissolved oxygen is critically low. Raise pump speed or reduce stocking." };
      if (this.ammonia > 1.2) return { level: "danger", title: "Ammonia spike", note: "Toxic ammonia is accumulating. Cut feeding and check biofilter contact." };
      if (this.nitrite > 0.8) return { level: "warn", title: "Nitrite pulse", note: "Nitrobacter is lagging. Keep flow and oxygen up while the filter catches up." };
      if (this.bacteriaA < 0.2) return { level: "warn", title: "New tank syndrome", note: "The biofilm is still thin. Stock lightly until nitrifiers colonize the media." };
      if (this.nitrate < 4 && this.plantBiomass > 6) return { level: "ok", title: "Nutrient hungry", note: "Plants are stripping nitrate faster than fish can supply it." };
      if (this.health < 0.45) return { level: "warn", title: "Fish stress", note: "Health is sliding. Check temperature, oxygen and nitrogen species." };
      if (this.efficiency > 80 && this.health > 0.75) return { level: "good", title: "Balanced loop", note: "Fish waste is tracking plant uptake. The system is cycling cleanly." };
      return { level: "ok", title: "Cycling", note: "The loop is stable enough to experiment. Nudge a slider and watch the cascade." };
    }

    snapshot() {
      return {
        ammonia: this.ammonia,
        nitrite: this.nitrite,
        nitrate: this.nitrate,
        oxygen: this.oxygen,
        ph: this.ph,
        solids: this.solids,
        bacteriaA: this.bacteriaA,
        bacteriaB: this.bacteriaB,
        plantBiomass: this.plantBiomass,
        plantGrowth: this.plantGrowth || 0,
        health: this.health,
        efficiency: this.efficiency,
        o2sat: this.o2sat || 8,
        rates: { ...this.rates },
        assess: this.assess(),
      };
    }
  }

  Aqua.Biology = Biology;
})(window.Aqua = window.Aqua || {});
