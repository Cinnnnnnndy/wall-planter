// proto_crumple.mjs — prototype the deep "crumpled kraft paper wrap" via SDF level-set.
// Builds a pot-like truncated cone whose outer surface is one continuous crumpled skin
// (faceted Voronoi folds + sharp creases). Tune AMP/CELL/CREASE to match the target look.
import Module from 'manifold-3d';
import { writeFileSync } from 'fs';
const wasm = await Module(); wasm.setup();
const { Manifold } = wasm;

const arg = Object.fromEntries(process.argv.slice(2).map(s => s.split('=')));
const AMP = +(arg.amp ?? 4);          // fold depth (mm)
const CELL = +(arg.cell ?? 40);       // base facet size (mm)
const OCT = +(arg.oct ?? 2);          // octaves
const TILT = +(arg.tilt ?? 0.7);      // per-facet tilt (bigger = steeper facets)
const DETAIL = +(arg.detail ?? 0.5); // 2nd-scale fold-line amount (more = more creases)
const BIAS = +(arg.bias ?? 0.0);      // outward bias 0..1
const ROTA = +(arg.rot ?? 1);         // rotate domain per layer (1 = de-grid straight creases)
const HOLLOW = +(arg.hollow ?? 0);    // 1 = subtract smooth inner cavity + open top
const EL = +(arg.el ?? 1.6);          // voxel edge length (mm)
const SEED = 7;

function hash3(ix, iy, iz, salt) {
  let h = (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791) ^ Math.imul(salt + SEED, 2654435761)) >>> 0;
  h = (Math.imul((h ^ (h >>> 13)) >>> 0, 1274126177)) >>> 0;
  return (h & 0xffffff) / 0xffffff;
}
// fixed per-layer rotation (breaks grid alignment -> creases stay STRAIGHT but not axis-locked)
function rotmat(seed) {
  const a = hash3(seed, 9, 9, 41) * 6.2832, b = hash3(9, seed, 9, 42) * 6.2832, c = hash3(9, 9, seed, 43) * 6.2832;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  return [ca * cb, ca * sb * sc - sa * cc, ca * sb * cc + sa * sc,
          sa * cb, sa * sb * sc + ca * cc, sa * sb * cc - ca * sc,
          -sb, cb * sc, cb * cc];
}
const ROT = [0, 1, 2, 3, 4, 5, 6].map(rotmat);
const ap = (R, x, y, z) => [R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z];

// envelope of random tilted planes over a (rotated) jittered lattice => FLAT facets + STRAIGHT creases.
// sign>0 = max (convex: V-groove VALLEY creases); sign<0 = min (concave: RIDGE creases).
function env(x, y, z, cell, salt, sign) {
  let X = x, Y = y, Z = z;
  if (ROTA) { const r = ap(ROT[salt], x, y, z); X = r[0]; Y = r[1]; Z = r[2]; }
  const gx = X / cell, gy = Y / cell, gz = Z / cell;
  const ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz);
  let best = sign > 0 ? -1e9 : 1e9;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    const cx = ix + dx, cy = iy + dy, cz = iz + dz;
    const sx = cx + hash3(cx, cy, cz, salt * 4 + 1), sy = cy + hash3(cx, cy, cz, salt * 4 + 2), sz = cz + hash3(cx, cy, cz, salt * 4 + 3);
    const hc = hash3(cx, cy, cz, salt * 4 + 7) * 2 - 1;
    const tx = hash3(cx, cy, cz, salt * 4 + 8) * 2 - 1, ty = hash3(cx, cy, cz, salt * 4 + 9) * 2 - 1, tz = hash3(cx, cy, cz, salt * 4 + 10) * 2 - 1;
    const plane = hc + TILT * (tx * (gx - sx) + ty * (gy - sy) + tz * (gz - sz));
    if (sign > 0) { if (plane > best) best = plane; } else { if (plane < best) best = plane; }
  }
  return best;
}
// flat facets bounded by straight fold lines; both valley (max) and ridge (min) creases.
function crumple(x, y, z) {
  let h = env(x, y, z, CELL, 1, +1) + env(x, y, z, CELL * 0.92, 2, -1);
  let w = 2;
  if (DETAIL > 0) { h += DETAIL * (env(x, y, z, CELL * 0.5, 3, +1) + env(x, y, z, CELL * 0.52, 4, -1)); w += 2 * DETAIL; }
  return 0.62 * h / w + BIAS;   // ~[-1,1]
}

// pot-like truncated cone, axis = z, positive-inside SDF
const r0 = 45, r1 = 66, H = 150;
const slope = (r1 - r0) / H, sc = 1 / Math.sqrt(1 + slope * slope);
function sdfCone(x, y, z) {
  const r = Math.hypot(x, y);
  const R = r0 + slope * z;
  return Math.min(z, H - z, (R - r) * sc); // positive inside
}
const t0 = Date.now();
const crumpled = Manifold.levelSet(
  (p) => sdfCone(p[0], p[1], p[2]) + AMP * crumple(p[0], p[1], p[2]),
  { min: [-r1 - AMP - 4, -r1 - AMP - 4, -AMP - 4], max: [r1 + AMP + 4, r1 + AMP + 4, H + AMP + 4] },
  EL
);
// optionally hollow: subtract smooth inner cone (cavity stays smooth) + open top
let pot = crumpled;
if (HOLLOW) {
  const inner = Manifold.cylinder(H, r0 - 4, r1 - 4, 96, false).translate([0, 0, 5]);
  pot = Manifold.difference(crumpled, inner);
}
const mesh = pot.getMesh();
console.log(`AMP=${AMP} CELL=${CELL} TILT=${TILT} DETAIL=${DETAIL} BIAS=${BIAS} ROT=${ROTA} HOLLOW=${HOLLOW} EL=${EL}`);
console.log(`tris ${mesh.triVerts.length / 3}  vol ${(pot.volume() / 1000).toFixed(0)}cc  in ${Date.now() - t0}ms`);

const vp = mesh.vertProperties, tv = mesh.triVerts, nt = tv.length / 3;
const buf = Buffer.alloc(84 + nt * 50); buf.writeUInt32LE(nt, 80); let o = 84;
for (let i = 0; i < tv.length; i += 3) {
  const a = tv[i] * 3, b = tv[i + 1] * 3, c = tv[i + 2] * 3;
  const P = [[vp[a], vp[a + 1], vp[a + 2]], [vp[b], vp[b + 1], vp[b + 2]], [vp[c], vp[c + 1], vp[c + 2]]];
  let nx = (P[1][1] - P[0][1]) * (P[2][2] - P[0][2]) - (P[1][2] - P[0][2]) * (P[2][1] - P[0][1]);
  let ny = (P[1][2] - P[0][2]) * (P[2][0] - P[0][0]) - (P[1][0] - P[0][0]) * (P[2][2] - P[0][2]);
  let nz = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[1][1] - P[0][1]) * (P[2][0] - P[0][0]);
  const L = Math.hypot(nx, ny, nz) || 1;
  buf.writeFloatLE(nx / L, o); buf.writeFloatLE(ny / L, o + 4); buf.writeFloatLE(nz / L, o + 8); o += 12;
  for (const v of P) { buf.writeFloatLE(v[0], o); buf.writeFloatLE(v[1], o + 4); buf.writeFloatLE(v[2], o + 8); o += 12; }
  buf.writeUInt16LE(0, o); o += 2;
}
writeFileSync(arg.out || '/tmp/crumple_pot.stl', buf);
console.log('wrote', arg.out || '/tmp/crumple_pot.stl');
