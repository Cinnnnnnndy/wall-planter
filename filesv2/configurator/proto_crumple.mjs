// proto_crumple.mjs — prototype the deep "crumpled kraft paper wrap" via SDF level-set.
// Builds a pot-like truncated cone whose outer surface is one continuous crumpled skin
// (faceted Voronoi folds + sharp creases). Tune AMP/CELL/CREASE to match the target look.
import Module from 'manifold-3d';
import { writeFileSync } from 'fs';
const wasm = await Module(); wasm.setup();
const { Manifold } = wasm;

const arg = Object.fromEntries(process.argv.slice(2).map(s => s.split('=')));
const INTENSITY = +(arg.intensity ?? 0.6); // 起伏强度 — overall fold depth (reference ~0.6)
const CELL = +(arg.cell ?? 30);            // octave-0 Voronoi spacing (mm); smaller = denser folds
const OCT = +(arg.oct ?? 5);               // 褶皱层级 octaves
const CURL = +(arg.curl ?? 0);             // 纸张整体弯曲 — macro curl amount
const ROTA = +(arg.rot ?? 1);              // rotate domain per octave (de-grid)
const HOLLOW = +(arg.hollow ?? 0);         // 1 = subtract smooth inner cavity
const EL = +(arg.el ?? 1.4);               // voxel edge length (mm)
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

// 3D value noise (for the optional macro curl)
function vnoise(x, y, z, salt) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const wx = fx * fx * (3 - 2 * fx), wy = fy * fy * (3 - 2 * fy), wz = fz * fz * (3 - 2 * fz);
  let v = 0;
  for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) for (let dz = 0; dz <= 1; dz++)
    v += hash3(ix + dx, iy + dy, iz + dz, salt) * (dx ? wx : 1 - wx) * (dy ? wy : 1 - wy) * (dz ? wz : 1 - wz);
  return v * 2 - 1;
}
// F2-F1 "crackle" (one octave) x per-cell random SIGN: cells bulge UP or DOWN, meeting at a sharp
// branching crease network (= ZhouWu reference algorithm). The sign flips where F2-F1->0, so it's
// continuous with a sharp V-crease at every Voronoi boundary. cell = seed spacing in mm.
function crackleOct(x, y, z, cell, oct) {
  let X = x, Y = y, Z = z;
  if (ROTA) { const r = ap(ROT[oct % 7], x, y, z); X = r[0]; Y = r[1]; Z = r[2]; }
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
}
// multi-octave crackle (reference: 4x seeds -> cell*0.5; weight 1/2.2^oct) + optional macro curl
function crumple(x, y, z) {
  let h = 0, cell = CELL, w = 1;
  for (let o = 0; o < OCT; o++) { h += crackleOct(x, y, z, cell, o) * w; cell *= 0.5; w /= 2.2; }
  if (CURL > 0) h += (vnoise(x * 0.03, y * 0.03, z * 0.03, 71) * 15 + vnoise(x * 0.08, y * 0.08, z * 0.08, 72) * 5) * CURL;
  return INTENSITY * h;   // mm displacement
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
  (p) => sdfCone(p[0], p[1], p[2]) + crumple(p[0], p[1], p[2]),
  { min: [-r1 - 18, -r1 - 18, -18], max: [r1 + 18, r1 + 18, H + 18] },
  EL
);
// optionally hollow: subtract smooth inner cone (cavity stays smooth) + open top
let pot = crumpled;
if (HOLLOW) {
  const inner = Manifold.cylinder(H, r0 - 4, r1 - 4, 96, false).translate([0, 0, 5]);
  pot = Manifold.difference(crumpled, inner);
}
const mesh = pot.getMesh();
console.log(`INTENSITY=${INTENSITY} CELL=${CELL} OCT=${OCT} CURL=${CURL} ROT=${ROTA} HOLLOW=${HOLLOW} EL=${EL}`);
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
