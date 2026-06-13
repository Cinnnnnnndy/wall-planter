// crumple.mjs — wrap the whole module outer (box ∪ cup) in one continuous crumpled-paper
// skin via SDF level-set, then cut the smooth cavity / clean mouth / functional holes.
// "imagine the finished module with no texture, wrapped in one sheet of crumpled kraft
//  paper, then the pot mouth cut open" — that is exactly this pipeline.
import { DEFAULTS, derive } from './geometry.mjs';

export const CRUMPLE_DEFAULTS = {
  amp: 9,        // fold depth (mm) — locked
  cell: 44,      // facet size (mm); smaller = more fold lines
  detail: 0.4,   // 2nd-scale fold-line amount (0 = few big facets, ~0.7 = many creases)
  tilt: 0.9,     // per-facet tilt (steeper -> sharper creases)
  bias: 0.35,    // outward bias 0..1 (folds bulge out; keeps inner wall)
  rot: 1,        // rotate domain per layer (straight creases, de-gridded)
  inClamp: 2.5,  // max inward displacement (mm) — protects the 3mm cup wall
  el: 1.2,       // voxel edge length (mm)
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
  // fixed per-layer rotation: creases stay STRAIGHT (no domain warp) but not axis-locked
  const rotmat = (seed) => {
    const a = hash3(seed, 9, 9, 41) * 6.2832, b = hash3(9, seed, 9, 42) * 6.2832, c = hash3(9, 9, seed, 43) * 6.2832;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
    return [ca * cb, ca * sb * sc - sa * cc, ca * sb * cc + sa * sc,
            sa * cb, sa * sb * sc + ca * cc, sa * sb * cc - ca * sc,
            -sb, cb * sc, cb * cc];
  };
  const ROT = [0, 1, 2, 3, 4, 5, 6].map(rotmat);
  const ap = (R, x, y, z) => [R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z];
  // envelope of random tilted planes over a rotated jittered lattice => FLAT facets + STRAIGHT creases.
  // sign>0 = max (convex: V-groove VALLEY creases); sign<0 = min (concave: RIDGE creases).
  const env = (x, y, z, cell, salt, sign) => {
    let X = x, Y = y, Z = z;
    if (o.rot) { const r = ap(ROT[salt], x, y, z); X = r[0]; Y = r[1]; Z = r[2]; }
    const gx = X / cell, gy = Y / cell, gz = Z / cell;
    const ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz);
    let best = sign > 0 ? -1e9 : 1e9;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const cx = ix + dx, cy = iy + dy, cz = iz + dz;
      const sx = cx + hash3(cx, cy, cz, salt * 4 + 1), sy = cy + hash3(cx, cy, cz, salt * 4 + 2), sz = cz + hash3(cx, cy, cz, salt * 4 + 3);
      const hc = hash3(cx, cy, cz, salt * 4 + 7) * 2 - 1;
      const tx = hash3(cx, cy, cz, salt * 4 + 8) * 2 - 1, ty = hash3(cx, cy, cz, salt * 4 + 9) * 2 - 1, tz = hash3(cx, cy, cz, salt * 4 + 10) * 2 - 1;
      const plane = hc + o.tilt * (tx * (gx - sx) + ty * (gy - sy) + tz * (gz - sz));
      if (sign > 0) { if (plane > best) best = plane; } else { if (plane < best) best = plane; }
    }
    return best;
  };
  // flat facets bounded by straight fold lines; valley(max) + ridge(min) creases.
  return (x, y, z) => {
    let h = env(x, y, z, o.cell, 1, +1) + env(x, y, z, o.cell * 0.92, 2, -1);
    let w = 2;
    if (o.detail > 0) { h += o.detail * (env(x, y, z, o.cell * 0.5, 3, +1) + env(x, y, z, o.cell * 0.52, 4, -1)); w += 2 * o.detail; }
    return 0.62 * h / w + o.bias;
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
  const raw = Manifold.difference(crumpled, U(cuts));
  // deep folds + booleans can pinch off tiny ~0-volume specks; keep only the main solid
  let module = raw;
  const comps = raw.decompose();
  if (comps.length > 1) module = comps.reduce((best, c) => (c.volume() > best.volume() ? c : best));
  return { module, d, p, o };
}
