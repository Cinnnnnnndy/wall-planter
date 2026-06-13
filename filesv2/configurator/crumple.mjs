// crumple.mjs — wrap the whole module outer (box ∪ cup) in one continuous crumpled-paper
// skin via SDF level-set, then cut the smooth cavity / clean mouth / functional holes.
// "imagine the finished module with no texture, wrapped in one sheet of crumpled kraft
//  paper, then the pot mouth cut open" — that is exactly this pipeline.
import { DEFAULTS, derive } from './geometry.mjs';

export const CRUMPLE_DEFAULTS = {
  intensity: 0.2,  // 起伏强度 — fold depth multiplier (gentle, paper-like)
  cell: 38,        // octave-0 Voronoi seed spacing (mm); smaller = denser folds
  octaves: 5,      // 褶皱层级
  curl: 0,         // 纸张整体弯曲 — macro curl amount (0 = none)
  rot: 1,          // rotate domain per octave (de-grid)
  inClamp: 2.2,    // max inward displacement (mm) — protects the 3mm cup wall
  el: 1.2,         // voxel edge length (mm)
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
  const vnoise = (x, y, z, salt) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const wx = fx * fx * (3 - 2 * fx), wy = fy * fy * (3 - 2 * fy), wz = fz * fz * (3 - 2 * fz);
    let v = 0;
    for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) for (let dz = 0; dz <= 1; dz++)
      v += hash3(ix + dx, iy + dy, iz + dz, salt) * (dx ? wx : 1 - wx) * (dy ? wy : 1 - wy) * (dz ? wz : 1 - wz);
    return v * 2 - 1;
  };
  // F2-F1 "crackle" x per-cell random SIGN (ZhouWu crumpled-paper algorithm): each Voronoi cell
  // bulges UP or DOWN; cells meet at a sharp branching crease network. Sign flips where F2-F1->0
  // so it stays continuous with a sharp V-crease at every cell boundary. cell = seed spacing (mm).
  const crackleOct = (x, y, z, cell, oct) => {
    let X = x, Y = y, Z = z;
    if (o.rot) { const r = ap(ROT[oct % 7], x, y, z); X = r[0]; Y = r[1]; Z = r[2]; }
    const gx = X / cell, gy = Y / cell, gz = Z / cell;
    const ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz);
    let f1 = 1e18, f2 = 1e18, sgn = 1;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const cx = ix + dx, cy = iy + dy, cz = iz + dz;
      const sx = cx + hash3(cx, cy, cz, oct * 5 + 1), sy = cy + hash3(cx, cy, cz, oct * 5 + 2), sz = cz + hash3(cx, cy, cz, oct * 5 + 3);
      const ddx = gx - sx, ddy = gy - sy, ddz = gz - sz; const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
      if (d2 < f1) { f2 = f1; f1 = d2; sgn = hash3(cx, cy, cz, oct * 5 + 4) > 0.5 ? 1 : -1; }
      else if (d2 < f2) f2 = d2;
    }
    return (Math.sqrt(f2) - Math.sqrt(f1)) * cell * sgn;   // mm, signed
  };
  // multi-octave (reference: 4x seeds -> cell*0.5; weight 1/2.2^oct) + optional macro curl. Returns mm.
  return (x, y, z) => {
    let h = 0, cell = o.cell, w = 1;
    for (let i = 0; i < o.octaves; i++) { h += crackleOct(x, y, z, cell, i) * w; cell *= 0.5; w /= 2.2; }
    if (o.curl > 0) h += (vnoise(x * 0.03, y * 0.03, z * 0.03, 71) * 15 + vnoise(x * 0.08, y * 0.08, z * 0.08, 72) * 5) * o.curl;
    return h;
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
    let dz = o.intensity * field(px + off[0], py + off[1], pz + off[2]) * fade;
    if (dz < -o.inClamp) dz = -o.inClamp;                     // protect cup wall / cavity
    return base + dz;
  };
  const m = 14;
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
