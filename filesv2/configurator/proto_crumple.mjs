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
const MIX = +(arg.mix ?? 0.5);        // 1=all valleys(concave), 0=all peaks(convex), .5=both
const BIAS = +(arg.bias ?? 0.0);      // outward bias 0..1
const WARP = +(arg.warp ?? 0.4);      // domain warp (0=grid-regular, larger=organic)
const HOLLOW = +(arg.hollow ?? 0);    // 1 = subtract smooth inner cavity + open top
const EL = +(arg.el ?? 1.8);          // voxel edge length (mm)
const SEED = 7;

function hash3(ix, iy, iz, salt) {
  let h = (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791) ^ Math.imul(salt + SEED, 2654435761)) >>> 0;
  h = (Math.imul((h ^ (h >>> 13)) >>> 0, 1274126177)) >>> 0;
  return (h & 0xffffff) / 0xffffff;
}
// crumpled paper = envelope of random tilted planes (one per Voronoi cell).
// Adjacent facets meet at sharp creases (the natural plane intersection) — no gouging.
function octave(x, y, z, cell) {
  const gx = x / cell, gy = y / cell, gz = z / cell;
  const ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz);
  let mn = 1e9, mx = -1e9;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    const cx = ix + dx, cy = iy + dy, cz = iz + dz;
    const sx = cx + hash3(cx, cy, cz, 1), sy = cy + hash3(cx, cy, cz, 2), sz = cz + hash3(cx, cy, cz, 3);
    const hc = hash3(cx, cy, cz, 7) * 2 - 1;
    const tx = hash3(cx, cy, cz, 8) * 2 - 1, ty = hash3(cx, cy, cz, 9) * 2 - 1, tz = hash3(cx, cy, cz, 10) * 2 - 1;
    const plane = hc + TILT * (tx * (gx - sx) + ty * (gy - sy) + tz * (gz - sz));
    if (plane < mn) mn = plane; if (plane > mx) mx = plane;
  }
  return MIX * mn + (1 - MIX) * mx;   // lower envelope (creased valleys) / upper (ridges)
}
// smooth value noise for domain warp (breaks grid alignment -> organic folds)
function vnoise(x, y, z, salt) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const wx = fx * fx * (3 - 2 * fx), wy = fy * fy * (3 - 2 * fy), wz = fz * fz * (3 - 2 * fz);
  let v = 0;
  for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) for (let dz = 0; dz <= 1; dz++)
    v += hash3(ix + dx, iy + dy, iz + dz, salt) * (dx ? wx : 1 - wx) * (dy ? wy : 1 - wy) * (dz ? wz : 1 - wz);
  return v * 2 - 1;
}
function crumple(x, y, z) {
  // domain warp on the large scale
  const ws = CELL * 0.6, wa = WARP * CELL;
  const wx = wa * vnoise(x / ws, y / ws, z / ws, 21);
  const wy = wa * vnoise(x / ws, y / ws, z / ws, 22);
  const wz = wa * vnoise(x / ws, y / ws, z / ws, 23);
  x += wx; y += wy; z += wz;
  let total = 0, A = 1, cell = CELL, W = 0;
  for (let o = 0; o < OCT; o++) { total += A * octave(x, y, z, cell); W += A; A *= 0.5; cell *= 0.5; }
  return total / W + BIAS;   // ~[-1,1] (+bias)
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
console.log(`AMP=${AMP} CELL=${CELL} OCT=${OCT} TILT=${TILT} MIX=${MIX} BIAS=${BIAS} HOLLOW=${HOLLOW} EL=${EL}`);
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
