// geometry.mjs — parametric wall-planter geometry, ported from wall_planter_v5.scad.
// Runs in Node (for testing) and the browser; pass an initialized manifold-3d module in.
// Mirrors the .scad variable names so it stays auditable against the source of truth.

export const DEFAULTS = {
  // pot (removable real pot) -> cavity = this + clearance
  pot_top_d: 131.2, pot_bot_d: 93.2, pot_height: 148, fit_clear: 1.5,
  // tilted cup / walls
  tilt: 40, wall: 3.0, floor_t: 6, mouth_ext: 6,
  // box + back
  box_d: 66, pot_back: 28, back_t: 6, side_gap: 15, res_h: 25, lens_open: 5,
  // downpipe shaft
  shaft_d: 23, shaft_x: 17, shaft_y: 19, vent_d: 6, vent_n: 3,
  // inter-layer connector
  conn_bore: 15, conn_sock: 12, conn_flange_h: 3, conn_recess: 1.0,
  // locating holes / pins
  join_d: 7, join_clear: 0.5, pin_clear: 0.35, peg_dp: 9, tile_dp: 8, pin_len: 16,
  // pot-rim lip (off; real pot has its own rim)
  lip_on: false, lip_w: 6, lip_t: 4, drip_w: 1.6, drip_d2: 2.2,
  // stabilising base
  base_reach_f: 112, base_reach_b: 58, base_h: 16, base_wall: 4, base_deck: 3,
  // back hex lattice lightening
  back_lattice: true, lat_cell: 18, lat_wall: 7, lat_border: 12, lat_top: 16,
  lat_keep: 2.5, lat_frontsk: 4, lat_rib: 3, lat_ydepth: 30,
  // tessellation
  fn: 64, fn_hole: 32,
};

// Derived params (pure function of the inputs) — same formulas as the .scad.
export function derive(p) {
  const d = { ...p };
  const rad = Math.PI / 180;
  d.in_bot = p.pot_bot_d + 2 * p.fit_clear;
  d.in_top = p.pot_top_d + 2 * p.fit_clear;
  d.out_bot = d.in_bot + 2 * p.wall;
  d.out_top = d.in_top + 2 * p.wall;
  d.ay = Math.cos(p.tilt * rad);
  d.az = Math.sin(p.tilt * rad);
  d.rate = (p.pot_top_d - p.pot_bot_d) / p.pot_height;
  d.r_in = d.in_bot / 2;
  d.r_out = d.out_bot / 2;
  d.z_dip = p.wall + p.res_h - p.lens_open;
  d.p0y = d.r_out * d.az - p.floor_t * d.ay - p.pot_back;
  d.p0z = d.z_dip - p.floor_t * d.az + d.r_in * d.ay;
  d.back_y = d.p0y + p.floor_t * d.ay - d.r_out * d.az;
  d.cup_len2 = p.floor_t + p.pot_height + p.mouth_ext;
  d.seat_top = p.floor_t + p.pot_height;
  d.od0 = (d.in_bot - d.rate * p.floor_t) + 2 * p.wall;
  d.od1 = (d.in_top + d.rate * p.mouth_ext) + 2 * p.wall;
  d.op_y = d.p0y + d.seat_top * d.ay;
  d.op_z = d.p0z + d.seat_top * d.az;
  d.mod_w = d.out_top + 2 * p.side_gap;
  d.cx = d.mod_w / 2;
  d.front_y = d.op_y + (d.out_top / 2) * d.az;
  d.mod_d = d.front_y + 8;
  d.tot_d = d.mod_d - d.back_y;
  d.apex_mouth = d.p0z + d.cup_len2 * d.az + (d.od1 / 2) * d.ay;
  d.apex_lip = d.op_z + ((d.out_top + 2 * (p.lip_on ? p.lip_w : 0)) / 2) * d.ay;
  d.mod_h = Math.max(d.apex_mouth, d.apex_lip) + 8;
  d.vent_z = d.p0z + 8;
  d.peg_xs = [d.mod_w * 0.27, d.mod_w * 0.70];
  d.peg_y = p.back_t / 2 + 2;
  d.tile_zs = [d.mod_h * 0.34, d.mod_h * 0.70];
  d.conn_flange_d = p.shaft_d + 3;
  d.conn_fit = p.shaft_d - 0.8;
  d.lat_zmin = p.wall + p.res_h + 8;
  d.ydep = Math.min(p.lat_ydepth, p.box_d - p.lat_frontsk);
  return d;
}

// Build all parts. Returns { planter, connector, pin, base, d } (manifolds + derived).
export function build(Manifold, params = {}) {
  const p = { ...DEFAULTS, ...params };
  const d = derive(p);
  const { cube, cylinder } = Manifold;
  const U = (arr) => arr.reduce((a, b) => a.add(b));
  const tilt2 = -(90 - p.tilt);

  // frustum(d1,d2,len): tilted cone, base at local origin, axis along the pot axis.
  const frustum = (d1, d2, len, seg = p.fn) =>
    cylinder(len, d1 / 2, d2 / 2, seg, false).rotate([tilt2, 0, 0]);
  // place at cup origin then slide `dist` up the pot axis
  const atAxis = (m, dist = 0) => m.translate([0, dist * d.ay, dist * d.az]).translate([d.cx, d.p0y, d.p0z]);
  const clip = (m) => m.intersect(cube([d.mod_w + 2, d.mod_d + 600, d.mod_h + 400]).translate([-1, -300, 0]));
  const cyl = (h, dia, seg = p.fn_hole) => cylinder(h, dia / 2, dia / 2, seg, false);

  // ---- outer shell: box + protruding clipped cup -------------------------
  let outer = cube([d.mod_w, p.box_d, d.mod_h]).add(
    clip(atAxis(frustum(d.od0, d.od1, d.cup_len2)))
  );

  // ---- cuts --------------------------------------------------------------
  const cuts = [];
  // 1) pot cavity (cone + mouth opening)
  cuts.push(atAxis(frustum(d.in_bot, d.in_top, p.pot_height), p.floor_t));
  cuts.push(atAxis(frustum(d.in_top, d.in_top + d.rate * p.mouth_ext, p.mouth_ext + 0.1), d.seat_top));
  // 2) reservoir box
  cuts.push(cube([d.mod_w - 2 * p.wall, p.box_d - 2 * p.wall, p.res_h]).translate([p.wall, p.wall, p.wall]));
  // 3) downpipe shaft + top counterbore + bottom lead-in
  cuts.push(cyl(d.mod_h + 2, p.shaft_d).translate([p.shaft_x, p.shaft_y, -1]));
  cuts.push(cyl(p.conn_flange_h + p.conn_recess + 0.4, d.conn_flange_d + 2 * p.join_clear)
    .translate([p.shaft_x, p.shaft_y, d.mod_h - p.conn_flange_h - p.conn_recess]));
  cuts.push(cylinder(3, (p.shaft_d + 3) / 2, p.shaft_d / 2, p.fn_hole, false)
    .translate([p.shaft_x, p.shaft_y, -0.01]));
  // 4) back vents into root zone
  for (let k = 0; k < p.vent_n; k++)
    cuts.push(cyl(p.box_d + 1, p.vent_d).rotate([-90, 0, 0])
      .translate([d.cx + (k - (p.vent_n - 1) / 2) * 32, -0.5, d.vent_z]));
  // 5) stacking locating holes (top & bottom, asymmetric)
  for (const sx of d.peg_xs) {
    cuts.push(cyl(p.peg_dp + 1, p.join_d + p.join_clear).translate([sx, d.peg_y, d.mod_h - p.peg_dp]));
    cuts.push(cyl(p.peg_dp + 1, p.join_d + p.join_clear).translate([sx, d.peg_y, -1]));
  }
  // 6) side tiling holes (above reservoir)
  for (const sz of d.tile_zs) {
    cuts.push(cyl(p.tile_dp + 1, p.join_d + p.join_clear).rotate([0, 90, 0]).translate([-1, d.peg_y, sz]));
    cuts.push(cyl(p.tile_dp + 1, p.join_d + p.join_clear).rotate([0, 90, 0]).translate([d.mod_w - p.tile_dp, d.peg_y, sz]));
  }

  let unit = Manifold.difference(outer, U(cuts));

  // ---- back hex lattice: hollow + grid rib skin --------------------------
  if (p.back_lattice) {
    const cupProtect = atAxis(frustum(d.od0 + 2 * p.lat_keep, d.od1 + 2 * p.lat_keep, d.cup_len2));
    const shaftProtect = cyl(d.mod_h + 4, p.shaft_d + 2 * p.lat_keep).translate([p.shaft_x, p.shaft_y, -2]);
    const hollowGross = cube([d.mod_w - 2 * p.lat_border, d.ydep + 1, (d.mod_h - p.lat_top) - d.lat_zmin])
      .translate([p.lat_border, -1, d.lat_zmin]);
    const back_hollow = Manifold.difference(hollowGross, cupProtect.add(shaftProtect));
    unit = Manifold.difference(unit, back_hollow);

    // hex window array (pointy-top honeycomb)
    const R = p.lat_cell / Math.sqrt(3);
    const px = p.lat_cell + p.lat_wall;
    const pz = 1.5 * R + p.lat_wall * 0.87;
    const z1 = d.mod_h - p.lat_top, x0 = p.lat_border, x1 = d.mod_w - p.lat_border;
    const nz = Math.floor((z1 - d.lat_zmin - 2 * R) / pz);
    const hexes = [];
    for (let iz = 0; iz <= Math.max(0, nz); iz++) {
      const zz = d.lat_zmin + R + iz * pz;
      const xoff = (iz % 2) * px / 2;
      const nx = Math.floor((x1 - x0 - p.lat_cell - xoff) / px);
      for (let ix = 0; ix <= Math.max(0, nx); ix++) {
        const xx = x0 + p.lat_cell / 2 + xoff + ix * px;
        hexes.push(cylinder(p.box_d + 2, R, R, 6, false).rotate([0, 0, 30]).rotate([-90, 0, 0]).translate([xx, -1, zz]));
      }
    }
    const windows = U(hexes);
    const ribGross = cube([d.mod_w - 2 * p.lat_border, p.lat_rib, (d.mod_h - p.lat_top) - d.lat_zmin])
      .translate([p.lat_border, 0, d.lat_zmin]);
    const ribSub = U([
      windows,
      atAxis(frustum(d.in_bot, d.in_top, p.pot_height), p.floor_t),
      atAxis(frustum(d.in_top, d.in_top + d.rate * p.mouth_ext, p.mouth_ext + 0.1), d.seat_top),
      cyl(d.mod_h + 2, p.shaft_d).translate([p.shaft_x, p.shaft_y, -1]),
    ]);
    const ribs = Manifold.difference(ribGross, ribSub);
    unit = unit.add(ribs);
  }

  // ---- connector (separate print) ----------------------------------------
  const cf = d.conn_fit;
  let connector = Manifold.difference(
    U([
      cylinder(p.conn_sock, (cf - 1.2) / 2, cf / 2, p.fn_hole, false),
      cylinder(p.conn_flange_h, d.conn_flange_d / 2, d.conn_flange_d / 2, p.fn_hole, false).translate([0, 0, p.conn_sock]),
      cylinder(p.conn_sock, cf / 2, (cf - 1.2) / 2, p.fn_hole, false).translate([0, 0, p.conn_sock + p.conn_flange_h]),
    ]),
    cyl(2 * p.conn_sock + p.conn_flange_h + 2, p.conn_bore).translate([0, 0, -1])
  );

  // ---- pin (chamfered both ends; revolve approximated as stacked cones) ---
  const pd = p.join_d - p.pin_clear;
  const pin = U([
    cylinder(1, (pd - 2) / 2, pd / 2, p.fn_hole, false),
    cyl(p.pin_len - 2, pd).translate([0, 0, 1]),
    cylinder(1, pd / 2, (pd - 2) / 2, p.fn_hole, false).translate([0, 0, p.pin_len - 1]),
  ]);

  // ---- base (stabilising foot) -------------------------------------------
  const by0 = -p.base_reach_b, byL = p.box_d + p.base_reach_f - by0;
  const pin_d = p.join_d - p.pin_clear;
  let baseSolid = U([
    cube([d.mod_w, p.box_d, p.base_deck]).translate([0, 0, p.base_h - p.base_deck]),
    Manifold.hull([cube([d.mod_w, 0.1, p.base_h]).translate([0, p.box_d - 0.1, 0]),
      cube([d.mod_w, 2, 3]).translate([0, p.box_d + p.base_reach_f - 2, 0])]),
    Manifold.hull([cube([d.mod_w, 0.1, p.base_h]),
      cube([d.mod_w, 2, 3]).translate([0, by0, 0])]),
    Manifold.difference(cube([d.mod_w, byL, p.base_h]).translate([0, by0, 0]),
      cube([d.mod_w - 2 * p.base_wall, byL - 2 * p.base_wall, p.base_h + 2]).translate([p.base_wall, by0 + p.base_wall, -1])),
    cube([p.base_wall, byL, p.base_h - p.base_deck]).translate([d.cx - p.base_wall / 2, by0, 0]),
    cube([d.mod_w, p.base_wall, p.base_h - p.base_deck]).translate([0, p.box_d / 2 - p.base_wall / 2, 0]),
  ]);
  baseSolid = Manifold.difference(baseSolid, cyl(p.base_h + 2, p.shaft_d + 1).translate([p.shaft_x, p.shaft_y, -1]));
  const basePins = U(d.peg_xs.map((sx) =>
    cyl(p.peg_dp - 1, pin_d).translate([sx, d.peg_y, p.base_h - p.base_deck])));
  const base = baseSolid.add(basePins);

  return { planter: unit, connector, pin, base, d, p };
}
