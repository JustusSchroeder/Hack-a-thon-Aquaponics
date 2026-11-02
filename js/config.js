(function (Aqua) {
  Aqua.CAT = {
    WALL: 0x0002,
    WATER: 0x0004,
    FISH: 0x0008,
    PLANT: 0x0010,
    FOOD: 0x0020,
    WASTE: 0x0040,
    MEDIA: 0x0080,
    IMPELLER: 0x0100,
    SENSOR: 0x0200,
  };

  Aqua.COLORS = {
    bg: "#07141c",
    glass: "#9fd7e6",
    glassFill: "#2f5563",
    copper: "#c98456",
    copperDark: "#8a5a38",
    steel: "#b7c6ce",
    steelDark: "#4d6570",
    water: "rgba(86, 214, 224, 0.78)",
    waterStroke: "rgba(210, 250, 255, 0.4)",
    waste: "#6b5340",
    food: "#e4c36a",
    mediaMech: "#8b7355",
    mediaBio: "#7fae8c",
    plant: "#74c15a",
    stem: "#3f7a38",
    impeller: "#e6d0a8",
    blade: "#c9a56a",
    fish: ["#f0a04b", "#e07a3d", "#efc48a", "#d2643b", "#f3b75c", "#c48a5a"],
  };

  Aqua.DEFAULTS = {
    pumpSpeed: 0.72,
    fishCount: 7,
    volumeL: 420,
    plantCount: 8,
    temperature: 26.5,
  };

  Aqua.PRESETS = {
    established: {
      label: "Established loop",
      params: { pumpSpeed: 0.72, fishCount: 7, volumeL: 420, plantCount: 8, temperature: 26.5 },
      water: {
        ammonia: 0.12,
        nitrite: 0.04,
        nitrate: 32,
        oxygen: 7.1,
        ph: 6.92,
        bacteriaA: 0.78,
        bacteriaB: 0.72,
        solids: 4,
      },
    },
    newTank: {
      label: "New tank syndrome",
      params: { pumpSpeed: 0.65, fishCount: 6, volumeL: 380, plantCount: 5, temperature: 25 },
      water: {
        ammonia: 0.85,
        nitrite: 0.22,
        nitrate: 3.5,
        oxygen: 7.8,
        ph: 7.45,
        bacteriaA: 0.08,
        bacteriaB: 0.05,
        solids: 1,
      },
    },
    overstocked: {
      label: "Overstocked",
      params: { pumpSpeed: 0.8, fishCount: 16, volumeL: 400, plantCount: 6, temperature: 28 },
      water: {
        ammonia: 1.4,
        nitrite: 0.55,
        nitrate: 48,
        oxygen: 5.2,
        ph: 7.1,
        bacteriaA: 0.5,
        bacteriaB: 0.42,
        solids: 18,
      },
    },
    jungle: {
      label: "Plant-heavy",
      params: { pumpSpeed: 0.6, fishCount: 5, volumeL: 500, plantCount: 14, temperature: 25.5 },
      water: {
        ammonia: 0.06,
        nitrite: 0.02,
        nitrate: 7,
        oxygen: 8.4,
        ph: 6.7,
        bacteriaA: 0.7,
        bacteriaB: 0.68,
        solids: 3,
      },
    },
    pumpFail: {
      label: "Pump failure",
      params: { pumpSpeed: 0, fishCount: 7, volumeL: 420, plantCount: 8, temperature: 27 },
      water: {
        ammonia: 0.2,
        nitrite: 0.08,
        nitrate: 30,
        oxygen: 6.4,
        ph: 6.9,
        bacteriaA: 0.74,
        bacteriaB: 0.7,
        solids: 6,
      },
    },
    cold: {
      label: "Cold water",
      params: { pumpSpeed: 0.7, fishCount: 7, volumeL: 420, plantCount: 8, temperature: 18.5 },
      water: {
        ammonia: 0.18,
        nitrite: 0.12,
        nitrate: 22,
        oxygen: 9.1,
        ph: 7.05,
        bacteriaA: 0.4,
        bacteriaB: 0.28,
        solids: 5,
      },
    },
  };

  Aqua.FISH_MIN = 1;
  Aqua.FISH_MAX = 18;
  Aqua.PLANT_MIN = 2;
  Aqua.PLANT_MAX = 16;
  Aqua.VOLUME_MIN = 180;
  Aqua.VOLUME_MAX = 720;
})(window.Aqua = window.Aqua || {});
