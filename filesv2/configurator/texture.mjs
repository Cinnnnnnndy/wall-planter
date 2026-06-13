// texture.mjs — crumpled-paper surface texture, ported from texturize.py with two changes:
//  (1) noise sampled in GLOBAL/array coordinates (vertex + tileOffset) -> continuous across
//      tiled modules (no seam), so a 3x3 / 4x3 array reads as one textured sheet;
//  (2) displacement is CENTERED about the nominal surface (in & out, mean~0) -> the texture
//      *becomes* the wall instead of an added outward shell -> no extra filament.
// Operates on a manifold mesh ({vertProperties:Float32Array, triVerts:Uint32Array}) and the
// derived geometry params `d`; returns new {vertProperties, triVerts} (Float32/Uint32).
import Delaunator from 'delaunator';

export const TEX_DEFAULTS = {
  amp: 1.6, cell: 17, octaves: 3, crease_w: 0.30, ridge_p: 0.7,
  curl: 0.24, tooth: 0.18, target_edge: 2.4, seed: 7,
};

// ---- value/cellular noise (hash matches texturize.py) ----------------------
function hash3(ix, iy, iz, salt) {
  let h = (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791) ^ Math.imul(salt, 2654435761)) >>> 0;
  h = (Math.imul((h ^ (h >>> 13)) >>> 0, 1274126177)) >>> 0;
  return (h & 0xffffff) / 0xffffff;
}
function cellularF2F1(x, y, z, cell) {
  const gx = x / cell, gy = y / cell, gz = z / cell;
  const ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz);
  let f1 = 1e9, f2 = 1e9;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    const cx = ix + dx, cy = iy + dy, cz = iz + dz;
    const sx = cx + hash3(cx, cy, cz, 1), sy = cy + hash3(cx, cy, cz, 2), sz = cz + hash3(cx, cy, cz, 3);
    const dd = Math.hypot(gx - sx, gy - sy, gz - sz);
    if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) { f2 = dd; }
  }
  return f2 - f1;
}
function valueNoise(x, y, z, cell) {
  const gx = x / cell, gy = y / cell, gz = z / cell;
  const ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz);
  const fx = gx - ix, fy = gy - iy, fz = gz - iz;
  const wx = fx * fx * (3 - 2 * fx), wy = fy * fy * (3 - 2 * fy), wz = fz * fz * (3 - 2 * fz);
  let v = 0;
  for (let dx = 0; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) for (let dz = 0; dz <= 1; dz++) {
    const h = hash3(ix + dx, iy + dy, iz + dz, 9);
    v += h * (dx ? wx : 1 - wx) * (dy ? wy : 1 - wy) * (dz ? wz : 1 - wz);
  }
  return v;
}
// height field in ~[0,1]; centered later. Crumpled = multi-octave ridged creases + curl + tooth.
function makeHeight(o) {
  return (x, y, z) => {
    let crease = 0, amp = 1, tot = 0, cell = o.cell;
    for (let i = 0; i < o.octaves; i++) {
      const dd = cellularF2F1(x, y, z, cell);
      const ridge = Math.pow(Math.min(Math.max(1 - dd / o.crease_w, 0), 1), o.ridge_p);
      crease += amp * ridge; tot += amp; amp *= 0.55; cell *= 0.5;
    }
    crease /= tot;
    const curl = valueNoise(x, y, z, o.cell * 1.7);
    const tooth = valueNoise(x, y, z, 5.0);
    return (1 - o.curl - o.tooth) * crease + o.curl * curl + o.tooth * tooth;
  };
}

// ---- main -----------------------------------------------------------------
// offset = [ox,oy,oz] world placement of this tile (for seamless arrays).
export function texturize(mesh, d, opts = {}) {
  const o = { ...TEX_DEFAULTS, ...opts };
  const off = opts.offset || [0, 0, 0];
  const VP = mesh.vertProperties, TV = mesh.triVerts;
  const F = TV.length / 3;
  const height = makeHeight(o);

  // geometry constants for face classification (pot axis), from derived params d
  const AX0 = [d.cx, d.p0y, d.p0z], AXD = [0, d.ay, d.az];
  const BOXD = d.box_d, OD0 = d.od0, RATE = d.rate, CUPLEN = d.cup_len2, OUTT = d.out_top;
  const axisSR = (px, py, pz) => {
    const rx = px - AX0[0], ry = py - AX0[1], rz = pz - AX0[2];
    const s = rx * AXD[0] + ry * AXD[1] + rz * AXD[2];
    const ax = rx - s * AXD[0], ay = ry - s * AXD[1], az = rz - s * AXD[2];
    return [s, Math.hypot(ax, ay, az), [ax, ay, az]];
  };
  const coneR = (s) => OD0 / 2 + (RATE / 2) * s;

  // per-face normal + centroid
  const fnx = new Float64Array(F), fny = new Float64Array(F), fnz = new Float64Array(F);
  const textured = new Uint8Array(F);
  const fcx = new Float64Array(F), fcy = new Float64Array(F), fcz = new Float64Array(F);
  for (let f = 0; f < F; f++) {
    const a = TV[f * 3] * 3, b = TV[f * 3 + 1] * 3, c = TV[f * 3 + 2] * 3;
    const ux = VP[b] - VP[a], uy = VP[b + 1] - VP[a + 1], uz = VP[b + 2] - VP[a + 2];
    const vx = VP[c] - VP[a], vy = VP[c + 1] - VP[a + 1], vz = VP[c + 2] - VP[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    fnx[f] = nx; fny[f] = ny; fnz[f] = nz;
    const cx = (VP[a] + VP[b] + VP[c]) / 3, cy = (VP[a + 1] + VP[b + 1] + VP[c + 1]) / 3, cz = (VP[a + 2] + VP[b + 2] + VP[c + 2]) / 3;
    fcx[f] = cx; fcy[f] = cy; fcz[f] = cz;
    // classify: front cone shell OR front box panel
    const [s, r, radv] = axisSR(cx, cy, cz);
    const rl = Math.hypot(radv[0], radv[1], radv[2]) || 1;
    const radOut = (nx * radv[0] + ny * radv[1] + nz * radv[2]) / rl;
    const coneShell = Math.abs(r - coneR(s)) < 1.8 && radOut > 0.15 && cy > 55 && s > 0 && s < CUPLEN + 1;
    const panel = ny > 0.6 && Math.abs(cy - BOXD) < 1.5;
    textured[f] = (coneShell || panel) ? 1 : 0;
  }

  // per-vertex normal from textured faces only (displacement direction)
  const nV = VP.length / 3;
  const vnx = new Float64Array(nV), vny = new Float64Array(nV), vnz = new Float64Array(nV);
  for (let f = 0; f < F; f++) if (textured[f]) for (let k = 0; k < 3; k++) {
    const vi = TV[f * 3 + k]; vnx[vi] += fnx[f]; vny[vi] += fny[f]; vnz[vi] += fnz[f];
  }
  for (let i = 0; i < nV; i++) { const L = Math.hypot(vnx[i], vny[i], vnz[i]) || 1; vnx[i] /= L; vny[i] /= L; vnz[i] /= L; }

  // edge -> incident faces; flags
  const ekey = (a, b) => (a < b ? a * 2654435761 + b : b * 2654435761 + a);
  const edgeFaces = new Map();
  for (let f = 0; f < F; f++) {
    const v = [TV[f * 3], TV[f * 3 + 1], TV[f * 3 + 2]];
    for (const [a, b] of [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]]) {
      const k = ekey(a, b); let e = edgeFaces.get(k); if (!e) edgeFaces.set(k, e = []); e.push(f);
    }
  }
  const SEAMT = 0.6; // mm tolerance for tile-seam planes
  const onSeam = (i, j) => {
    const xi = VP[i * 3], xj = VP[j * 3], zi = VP[i * 3 + 2], zj = VP[j * 3 + 2];
    const nearX0 = Math.abs(xi) < SEAMT && Math.abs(xj) < SEAMT;
    const nearXW = Math.abs(xi - d.mod_w) < SEAMT && Math.abs(xj - d.mod_w) < SEAMT;
    const nearZ0 = Math.abs(zi) < SEAMT && Math.abs(zj) < SEAMT;
    const nearZH = Math.abs(zi - d.mod_h) < SEAMT && Math.abs(zj - d.mod_h) < SEAMT;
    return nearX0 || nearXW || nearZ0 || nearZH;
  };
  // edge needs subdivision if adjacent to any textured face; "smoothBoundary" = adjacent to a
  // non-textured face AND not on a tile seam (feather there to stay watertight; NOT on seams).
  const edgeTex = new Map(), edgeFeather = new Map();
  for (const [k, fs] of edgeFaces) {
    let anyT = false, anyS = false; for (const f of fs) { if (textured[f]) anyT = true; else anyS = true; }
    edgeTex.set(k, anyT);
    edgeFeather.set(k, anyT && anyS);
  }

  const TARGET = o.target_edge;
  const nseg = (ax, ay, az, bx, by, bz) => Math.min(40, Math.max(1, Math.round(Math.hypot(bx - ax, by - ay, bz - az) / TARGET)));

  // output with global vertex weld keyed by original (un-displaced) position
  const outV = []; const outF = []; const pool = new Map();
  const q = (x) => Math.round(x / 2e-3);
  const disp = (px, py, pz, vi, w) => {
    const h = height(px + off[0], py + off[1], pz + off[2]) - 0.5; // centered
    const dmag = o.amp * h * w;
    return [px + vnx[vi] * dmag, py + vny[vi] * dmag, pz + vnz[vi] * dmag];
  };
  // weld using original position key but the stored coordinate is the displaced one
  const getv = (ox, oy, oz, dx, dy, dz) => {
    const key = q(ox) + ',' + q(oy) + ',' + q(oz);
    let idx = pool.get(key);
    if (idx === undefined) { idx = outV.length / 3; pool.set(key, idx); outV.push(dx, dy, dz); }
    return idx;
  };

  for (let f = 0; f < F; f++) {
    const i0 = TV[f * 3], i1 = TV[f * 3 + 1], i2 = TV[f * 3 + 2];
    const P = [[VP[i0 * 3], VP[i0 * 3 + 1], VP[i0 * 3 + 2]], [VP[i1 * 3], VP[i1 * 3 + 1], VP[i1 * 3 + 2]], [VP[i2 * 3], VP[i2 * 3 + 1], VP[i2 * 3 + 2]]];
    const es = [[i0, i1], [i1, i2], [i2, i0]];
    const ns = es.map(([a, b]) => edgeTex.get(ekey(a, b)) ? nseg(VP[a * 3], VP[a * 3 + 1], VP[a * 3 + 2], VP[b * 3], VP[b * 3 + 1], VP[b * 3 + 2]) : 1);
    const tex = textured[f];

    if (Math.max(...ns) === 1) { // no subdivision: emit (welded, displaced only if textured corner)
      const idx = [0, 1, 2].map((k) => {
        const vi = TV[f * 3 + k]; const [x, y, z] = P[k];
        if (tex) { const [dx, dy, dz] = disp(x, y, z, vi, 1); return getv(x, y, z, dx, dy, dz); }
        return getv(x, y, z, x, y, z);
      });
      outF.push(idx[0], idx[1], idx[2]); continue;
    }

    // build face local frame (u,v) in the face plane
    const e1 = norm(sub(P[1], P[0]));
    const e2 = norm(cross([fnx[f], fny[f], fnz[f]], e1));
    const toUV = (Q) => [dot(sub(Q, P[0]), e1), dot(sub(Q, P[0]), e2)];
    const uv3 = P.map(toUV);

    // boundary points along each edge (shared edge -> same count -> watertight)
    const pts = []; // 3d
    for (let k = 0; k < 3; k++) { const [ai, bi] = [k, (k + 1) % 3]; const n = ns[k]; for (let t = 0; t < n; t++) { const u = t / n; pts.push([P[ai][0] + (P[bi][0] - P[ai][0]) * u, P[ai][1] + (P[bi][1] - P[ai][1]) * u, P[ai][2] + (P[bi][2] - P[ai][2]) * u]); } }
    // interior grid (only for textured faces)
    if (tex) {
      const T = [[uv3[1][0] - uv3[0][0], uv3[2][0] - uv3[0][0]], [uv3[1][1] - uv3[0][1], uv3[2][1] - uv3[0][1]]];
      const det = T[0][0] * T[1][1] - T[0][1] * T[1][0];
      if (Math.abs(det) > 1e-9) {
        const inv = [[T[1][1] / det, -T[0][1] / det], [-T[1][0] / det, T[0][0] / det]];
        const us = uv3.map((p) => p[0]), vs = uv3.map((p) => p[1]);
        const umin = Math.min(...us) - 1, umax = Math.max(...us) + 1, vmin = Math.min(...vs) - 1, vmax = Math.max(...vs) + 1;
        const hstep = TARGET * 0.866; let row = 0;
        for (let vv = vmin; vv < vmax; vv += hstep, row++) {
          for (let uu = umin + (row % 2 ? TARGET / 2 : 0); uu < umax; uu += TARGET) {
            const bu = uu - uv3[0][0], bv = vv - uv3[0][1];
            const beta = inv[0][0] * bu + inv[0][1] * bv, gamma = inv[1][0] * bu + inv[1][1] * bv, alpha = 1 - beta - gamma;
            if (beta > 1e-6 && gamma > 1e-6 && alpha > 1e-6) {
              // distance to each edge >= 0.45*target (avoid sliver tris)
              let ok = true;
              for (let k = 0; k < 3; k++) { const a = uv3[k], b = uv3[(k + 1) % 3]; const ev = [b[0] - a[0], b[1] - a[1]]; const el = Math.hypot(ev[0], ev[1]) + 1e-12; const dd = Math.abs((uu - a[0]) * ev[1] - (vv - a[1]) * ev[0]) / el; if (dd < 0.45 * TARGET) { ok = false; break; } }
              if (ok) pts.push([P[0][0] + (uu - uv3[0][0]) * e1[0] + (vv - uv3[0][1]) * e2[0], P[0][1] + (uu - uv3[0][0]) * e1[1] + (vv - uv3[0][1]) * e2[1], P[0][2] + (uu - uv3[0][0]) * e1[2] + (vv - uv3[0][1]) * e2[2]]);
            }
          }
        }
      }
    }
    // 2d coords + dedup, then Delaunay
    const uvp = pts.map(toUV);
    const seen = new Map(); const keep = [];
    for (let i = 0; i < uvp.length; i++) { const kk = q(uvp[i][0]) + ',' + q(uvp[i][1]); if (!seen.has(kk)) { seen.set(kk, 1); keep.push(i); } }
    const KP = keep.map((i) => pts[i]); const KUV = keep.map((i) => uvp[i]);
    if (KP.length < 3) { const idx = [0, 1, 2].map((k) => getv(P[k][0], P[k][1], P[k][2], P[k][0], P[k][1], P[k][2])); outF.push(idx[0], idx[1], idx[2]); continue; }
    const del = new Delaunator(KUV.flat());
    // barycentric->normal interpolation + displacement weight (feather smooth-boundary, not seams)
    const T2 = [[uv3[1][0] - uv3[0][0], uv3[2][0] - uv3[0][0]], [uv3[1][1] - uv3[0][1], uv3[2][1] - uv3[0][1]]];
    const det2 = T2[0][0] * T2[1][1] - T2[0][1] * T2[1][0] || 1e-9;
    const inv2 = [[T2[1][1] / det2, -T2[0][1] / det2], [-T2[1][0] / det2, T2[0][0] / det2]];
    const idxMap = KP.map((Q, qi) => {
      const x = Q[0], y = Q[1], z = Q[2];
      if (!tex) return getv(x, y, z, x, y, z);
      // bary -> vertex normal
      const bu = KUV[qi][0] - uv3[0][0], bv = KUV[qi][1] - uv3[0][1];
      const beta = inv2[0][0] * bu + inv2[0][1] * bv, gamma = inv2[1][0] * bu + inv2[1][1] * bv, alpha = 1 - beta - gamma;
      let Nx = alpha * vnx[i0] + beta * vnx[i1] + gamma * vnx[i2];
      let Ny = alpha * vny[i0] + beta * vny[i1] + gamma * vny[i2];
      let Nz = alpha * vnz[i0] + beta * vnz[i1] + gamma * vnz[i2];
      const NL = Math.hypot(Nx, Ny, Nz) || 1; Nx /= NL; Ny /= NL; Nz /= NL;
      // feather weight: distance to smooth-boundary edges (not seams) / TAPER
      let w = 1;
      for (let k = 0; k < 3; k++) {
        const [a, b] = es[k];
        if (edgeFeather.get(ekey(a, b)) && !onSeam(a, b)) {
          const A = P[k], B = P[(k + 1) % 3]; const ab = sub(B, A); const L = Math.hypot(...ab) + 1e-12;
          const cr = cross(sub(Q, A), [ab[0] / L, ab[1] / L, ab[2] / L]); const dd = Math.hypot(...cr);
          w = Math.min(w, Math.min(Math.max(dd / 4.0, 0), 1));
        }
      }
      const hh = height(x + off[0], y + off[1], z + off[2]) - 0.5;
      const dm = o.amp * hh * w;
      return getv(x, y, z, x + Nx * dm, y + Ny * dm, z + Nz * dm);
    });
    const tri = del.triangles;
    for (let t = 0; t < tri.length; t += 3) {
      let a = tri[t], b = tri[t + 1], c = tri[t + 2];
      // orient to match face normal (delaunay is CCW in uv; flip if needed)
      const A = KUV[a], B = KUV[b], C = KUV[c];
      const area2 = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      if (Math.abs(area2) < 1e-4) continue;
      if (area2 < 0) { const tmp = b; b = c; c = tmp; }
      outF.push(idxMap[a], idxMap[b], idxMap[c]);
    }
  }
  return { vertProperties: new Float32Array(outV), triVerts: new Uint32Array(outF), textured };
}

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function norm(a) { const L = Math.hypot(...a) || 1; return [a[0] / L, a[1] / L, a[2] / L]; }
