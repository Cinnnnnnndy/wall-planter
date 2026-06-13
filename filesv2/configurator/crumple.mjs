// crumple.mjs — wrap the whole module outer (box ∪ cup) in one continuous crumpled-paper
// skin via SDF level-set, then cut the smooth cavity / clean mouth / functional holes.
// "imagine the finished module with no texture, wrapped in one sheet of crumpled kraft
//  paper, then the pot mouth cut open" — that is exactly this pipeline.
import { DEFAULTS, derive } from './geometry.mjs';

export const CRUMPLE_DEFAULTS = {
  amp: 9,        // fold depth (mm) — locked
  cell: 58,      // big-fold facet size (mm) — large sweeping folds
  fine: 0.2,     // subtle fine-wrinkle amount (0 = dead-flat facets, ~0.3 = busy)
  tilt: 1.0,     // per-facet tilt
  mix: 0.45,     // 1 concave / 0 convex / .5 both
  warp: 0.55,    // domain warp (organic, non-grid)
  bias: 0.42,    // outward bias 0..1 (folds bulge out; keeps inner wall)
  inClamp: 2.5,  // max inward displacement (mm) — protects the 3mm cup wall
  el: 1.3,       // voxel edge length (mm)
  seed: 7,
  offset: [0, 0, 0], // global/array offset -> seamless tiling
};

function makeField(o) {
  const S = o.seed;
  const hash3 = (ix, iy, iz, salt) => {
    let h = (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791) ^ Math.imul(salt + S, 2654435761)) >>> 0;
    h = (Math.imul((h ^ (h >>> 13)) >>> 0, 1274126177)) >>> 0;
    return (h & 0xffffff) / 0xffffff;
  };
  const vnoise = (x, y, z, salt) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const wx = fx * fx * (3 - 2 * fx), wy = fy * fy * (3 - 2 * fy), wz = fz * fz * (3 - 2 * fz);
    let v = 0;
    for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) for (let dz = 0; dz <= 1; dz++)
      v += hash3(ix + dx, iy + dy, iz + dz, salt) * (dx ? wx : 1 - wx) * (dy ? wy : 1 - wy) * (dz ? wz : 1 - wz);
    return v * 2 - 1;
  };
  const octave = (x, y, z, cell) => {
    const gx = x / cell, gy = y / cell, gz = z / cell;
    const ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz);
    let mn = 1e9, mx = -1e9;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const cx = ix + dx, cy = iy + dy, cz = iz + dz;
      const sx = cx + hash3(cx, cy, cz, 1), sy = cy + hash3(cx, cy, cz, 2), sz = cz + hash3(cx, cy, cz, 3);
      const hc = hash3(cx, cy, cz, 7) * 2 - 1;
      const tx = hash3(cx, cy, cz, 8) * 2 - 1, ty = hash3(cx, cy, cz, 9) * 2 - 1, tz = hash3(cx, cy, cz, 10) * 2 - 1;
      const plane = hc + o.tilt * (tx * (gx - sx) + ty * (gy - sy) + tz * (gz - sz));
      if (plane < mn) mn = plane; if (plane > mx) mx = plane;
    }
    return o.mix * mn + (1 - o.mix) * mx;
  };
  return (x, y, z) => {
    const ws = o.cell * 0.6, wa = o.warp * o.cell;
    const wx = wa * vnoise(x / ws, y / ws, z / ws, 21);
    const wy = wa * vnoise(x / ws, y / ws, z / ws, 22);
    const wz = wa * vnoise(x / ws, y / ws, z / ws, 23);
    x += wx; y += wy; z += wz;
    // big sweeping folds (dominant) + medium variation + a subtle fine wrinkle
    const big = 0.72 * octave(x, y, z, o.cell) + 0.28 * octave(x, y, z, o.cell * 0.5);
    const fine = octave(x, y, z, o.cell * 0.26);
    return big + o.fine * fine + o.bias;
  };
}

export function buildCrumpled(Manifold, params = {}, cOpts = {}) {
  const p = { ...DEFAULTS, ...params };
  const d = derive(p);
  const o = { ...CRUMPLE_DEFAULTS, ...cOpts };
  const field = makeField(o);
  const off = o.offset;

  // ---- outer-form SDF (positive inside): box ∪ (cup clipped to box width) ----
  const W = d.mod_w, D = p.box_d, H = d.mod_h;
  const sdBox = (px, py, pz) => {
    const qx = Math.abs(px - W / 2) - W / 2, qy = Math.abs(py - D / 2) - D / 2, qz = Math.abs(pz - H / 2) - H / 2;
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    const outside = Math.hypot(ox, oy, oz);
    const inside = Math.min(Math.max(qx, qy, qz), 0);
    return -(outside + inside);                    // positive inside
  };
  const bx = d.cx, by = d.p0y, bz = d.p0z;          // cup base point
  const L = d.cup_len2, rB = d.od0 / 2, rT = d.od1 / 2;
  const slope = (rT - rB) / L, cosA = 1 / Math.sqrt(1 + slope * slope);
  const sdCup = (px, py, pz) => {
    const rx = px - bx, ry = py - by, rz = pz - bz;
    const s = ry * d.ay + rz * d.az;                // axial coord along pot axis
    const ax = rx, ay = ry - s * d.ay, az = rz - s * d.az;
    const rad = Math.hypot(ax, ay, az);
    const R = rB + slope * s;
    const side = (R - rad) * cosA;
    let sd = Math.min(s, L - s, side);              // positive inside
    return Math.min(sd, px, W - px);                // clip cup to box x-range
  };
  const bot = 8;                                    // keep bottom face flat (mating) — fade crumple below z=bot
  const sdf = (pt) => {
    const px = pt[0], py = pt[1], pz = pt[2];
    const base = Math.max(sdBox(px, py, pz), sdCup(px, py, pz));
    const fade = Math.min(Math.max(pz / bot, 0), 1);          // 0 at bottom -> flat base
    let dz = o.amp * field(px + off[0], py + off[1], pz + off[2]) * fade;
    if (dz < -o.inClamp) dz = -o.inClamp;                     // protect cup wall / cavity
    return base + dz;
  };
  const m = o.amp + 6;
  const crumpled = Manifold.levelSet(sdf,
    { min: [-m, d.back_y - m, -3], max: [W + m, d.mod_d + m, H + m] }, o.el);

  // ---- cuts (smooth cavity + clean mouth + functional holes) ----
  const tilt2 = -(90 - p.tilt);
  const frustum = (d1, d2, len, seg = p.fn) => Manifold.cylinder(len, d1 / 2, d2 / 2, seg, false).rotate([tilt2, 0, 0]);
  const atAxis = (mm, dist = 0) => mm.translate([0, dist * d.ay, dist * d.az]).translate([d.cx, d.p0y, d.p0z]);
  const cyl = (h, dia, seg = p.fn_hole) => Manifold.cylinder(h, dia / 2, dia / 2, seg, false);
  const U = (a) => a.reduce((x, y) => x.add(y));
  const cuts = [
    atAxis(frustum(d.in_bot, d.in_top, p.pot_height), p.floor_t),                         // smooth pot cavity
    atAxis(frustum(d.in_top, d.in_top + d.rate * p.mouth_ext, p.mouth_ext + 0.1), d.seat_top), // clean mouth
    Manifold.cube([W - 2 * p.wall, D - 2 * p.wall, p.res_h]).translate([p.wall, p.wall, p.wall]),    // reservoir
    cyl(H + 2, p.shaft_d).translate([p.shaft_x, p.shaft_y, -1]),                            // downpipe
    cyl(p.conn_flange_h + p.conn_recess + 0.4, d.conn_flange_d + 2 * p.join_clear).translate([p.shaft_x, p.shaft_y, H - p.conn_flange_h - p.conn_recess]),
    Manifold.cylinder(3, (p.shaft_d + 3) / 2, p.shaft_d / 2, p.fn_hole, false).translate([p.shaft_x, p.shaft_y, -0.01]),
  ];
  for (let k = 0; k < p.vent_n; k++)
    cuts.push(cyl(D + 1, p.vent_d).rotate([-90, 0, 0]).translate([d.cx + (k - (p.vent_n - 1) / 2) * 32, -0.5, d.vent_z]));
  const module = Manifold.difference(crumpled, U(cuts));
  return { module, d, p, o };
}
