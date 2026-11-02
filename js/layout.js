(function (Aqua) {
  const L = {
    width: 1100,
    height: 760,
    wall: 12,
    pipeInner: 24,
    pipeWall: 7,
    grow: { x: 40, y: 42, w: 880, h: 140 },
    tank: { x: 40, y: 418, w: 760, h: 300 },
    mech: { x: 500, y: 230, w: 196, h: 138 },
    bio: { x: 736, y: 230, w: 196, h: 138 },
    pump: { x: 730, y: 682 },
    riserX: 1012,
    supplyY: 24,
    dumpX: 112,
  };

  L.grow.right = L.grow.x + L.grow.w;
  L.grow.bottom = L.grow.y + L.grow.h;
  L.tank.right = L.tank.x + L.tank.w;
  L.tank.bottom = L.tank.y + L.tank.h;
  L.mech.right = L.mech.x + L.mech.w;
  L.mech.bottom = L.mech.y + L.mech.h;
  L.bio.right = L.bio.x + L.bio.w;
  L.bio.bottom = L.bio.y + L.bio.h;

  L.drainX = L.mech.x + L.mech.w * 0.5;
  L.returnX = L.tank.x + 580;
  L.bioOutX = L.bio.x + L.bio.w * 0.5;
  L.filterMidY = L.mech.y + L.mech.h * 0.5;
  L.pumpOutlet = { x: L.tank.right + 8, y: L.pump.y };

  L.supply = [
    { x: L.pump.x + 16, y: L.pump.y },
    { x: L.riserX, y: L.pump.y },
    { x: L.riserX, y: L.supplyY },
    { x: L.dumpX, y: L.supplyY },
    { x: L.dumpX, y: L.grow.y + 26 },
  ];

  L.drain = [
    { x: L.drainX, y: L.grow.bottom - 8 },
    { x: L.drainX, y: L.mech.y + 10 },
  ];

  L.transfer = [
    { x: L.mech.right - 8, y: L.filterMidY },
    { x: L.bio.x + 8, y: L.filterMidY },
  ];

  L.ret = [
    { x: L.bioOutX, y: L.bio.bottom - 8 },
    { x: L.bioOutX, y: L.tank.y - 18 },
    { x: L.returnX, y: L.tank.y - 18 },
    { x: L.returnX, y: L.tank.y + 22 },
  ];

  Aqua.LAYOUT = L;
})(window.Aqua = window.Aqua || {});
