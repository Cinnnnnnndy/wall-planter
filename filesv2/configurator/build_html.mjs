// build_html.mjs — assemble the standalone configurator HTML from the tested modules.
// Inlines geometry.mjs + texture.mjs (single source of truth, node-validated) into one
// double-clickable HTML; pulls three.js / manifold-3d / delaunator / lil-gui / jszip from CDN.
import { readFileSync, writeFileSync } from 'fs';

const strip = (src) => src
  .replace(/^\s*import\s+.*$/gm, '')      // drop module imports (libs come from CDN scope)
  .replace(/^export\s+/gm, '')            // drop `export ` so decls live in module scope
  .replace(/\bexport\s+\{[^}]*\}\s*;?/g, '');

const geometry = strip(readFileSync(new URL('./geometry.mjs', import.meta.url), 'utf8'));
const texture = strip(readFileSync(new URL('./texture.mjs', import.meta.url), 'utf8'));

const V = { three: '0.160.0', manifold: '3.5.1', delaunator: '5.1.0', lilgui: '0.19.2', jszip: '3.10.1' };

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>墙面种植单元 · 参数配置器 (v5.3)</title>
<style>
  html,body{margin:0;height:100%;background:#1a1c20;color:#e6e8eb;font:13px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;overflow:hidden}
  #app{position:fixed;inset:0}
  #hud{position:fixed;top:10px;left:10px;background:rgba(35,38,44,.88);border:1px solid #33373e;border-radius:10px;padding:10px 12px;max-width:300px;z-index:5}
  #hud h1{margin:0 0 4px;font-size:14px}
  #hud .dim{color:#6cc08b;font-variant-numeric:tabular-nums}
  #hud .muted{color:#9aa0a8;font-size:11px;margin-top:6px}
  #busy{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);color:#fff;font-size:16px;z-index:20}
  #err{display:none;position:fixed;left:10px;bottom:10px;right:10px;max-height:40%;overflow:auto;z-index:30;background:#3a1414;border:1px solid #a33;border-radius:8px;color:#ffb4b4;padding:10px;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px}
  .lil-gui{--width:300px}
</style>
</head>
<body>
<div id="app"></div>
<div id="hud"><h1>墙面种植单元 · 配置器</h1>
  <div>阵列 <span class="dim" id="arr"></span> · 总尺寸 <span class="dim" id="tot"></span></div>
  <div>单元 <span class="dim" id="unit"></span> · 三角面 <span class="dim" id="tris"></span></div>
  <div class="muted">左键转 · 右键平移 · 滚轮缩放。纹理为「替换表面」(内外起伏, 不加料), 阵列间连续无缝。</div>
</div>
<div id="busy">计算中…</div>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@${V.three}/build/three.module.js",
  "delaunator": "https://cdn.jsdelivr.net/npm/delaunator@${V.delaunator}/+esm",
  "lil-gui": "https://cdn.jsdelivr.net/npm/lil-gui@${V.lilgui}/+esm"
}}
</script>
<div id="err"></div>
<script>
  // surface ANY error on screen (incl. failed module imports) instead of a black page
  window.__showErr = (m) => { const e = document.getElementById('err'); if(!e) return; e.style.display = 'block'; e.textContent += m + '\\n'; };
  addEventListener('error', (ev) => __showErr('ERROR: ' + (ev.message || ev.error) + (ev.filename ? (' @ ' + ev.filename + ':' + ev.lineno) : '')));
  addEventListener('unhandledrejection', (ev) => __showErr('PROMISE: ' + (ev.reason && (ev.reason.stack || ev.reason.message || ev.reason))));
</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@${V.three}/examples/jsm/controls/OrbitControls.js';
import ManifoldModule from 'https://cdn.jsdelivr.net/npm/manifold-3d@${V.manifold}/manifold.js';
import Delaunator from 'delaunator';
import GUI from 'lil-gui';

// ============================ inlined geometry.mjs ============================
${geometry}
// ============================ inlined texture.mjs ============================
${texture}
// ============================ app ============================
const wasm = await ManifoldModule({ locateFile: (path) => path.endsWith('.wasm') ? 'https://cdn.jsdelivr.net/npm/manifold-3d@${V.manifold}/manifold.wasm' : path });
wasm.setup();
const Manifold = wasm.Manifold;

const app = document.getElementById('app');
const busy = document.getElementById('busy');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio); renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1a1c20);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 5000);
camera.position.set(280, 240, 420);
const controls = new OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
scene.add(new THREE.HemisphereLight(0xffffff, 0x444455, 1.1));
const dl = new THREE.DirectionalLight(0xffffff, 1.3); dl.position.set(0.5, 1, 0.8); scene.add(dl);
const dl2 = new THREE.DirectionalLight(0xffffff, 0.5); dl2.position.set(-0.6, 0.3, -0.7); scene.add(dl2);
const mat = new THREE.MeshStandardMaterial({ color: 0xcaa64a, roughness: 0.85, metalness: 0.0, flatShading: false, side: THREE.DoubleSide });

const params = {
  // box / pot
  tilt: 40, pot_height: 148, box_d: 66, side_gap: 15,
  // back lattice
  back_lattice: true, lat_cell: 18, lat_wall: 7, lat_ydepth: 30,
  // texture
  tex_on: false, amp: 1.6, cell: 17, octaves: 3, curl: 0.24, target_edge: 2.8,
  // array
  nx: 3, nz: 3, gap: 0,
  // actions
  rebuild: () => rebuild(true),
  exportCombined: () => exportCombinedSTL(),
  exportParts: () => exportPartsZip(),
};

let group = new THREE.Group(); scene.add(group);
let cache = null;           // { d, planterMesh, connectorMesh, pinMesh, baseMesh }
let centerOffset = new THREE.Vector3();

function geoParams() {
  return { tilt: params.tilt, pot_height: params.pot_height, box_d: params.box_d, side_gap: params.side_gap,
    back_lattice: params.back_lattice, lat_cell: params.lat_cell, lat_wall: params.lat_wall, lat_ydepth: params.lat_ydepth };
}
function texOpts(offset) {
  return { offset, amp: params.amp, cell: params.cell, octaves: params.octaves, curl: params.curl, target_edge: params.target_edge };
}
function meshArrays(m) { return { vertProperties: m.vertProperties, triVerts: m.triVerts }; }

function buildGeometry() {
  const parts = build(Manifold, geoParams());
  const pm = parts.planter.getMesh();
  cache = {
    d: parts.d,
    planterMesh: meshArrays(pm),
    connectorMesh: meshArrays(parts.connector.getMesh()),
    pinMesh: meshArrays(parts.pin.getMesh()),
    baseMesh: meshArrays(parts.base.getMesh()),
  };
  parts.planter.delete(); parts.connector.delete(); parts.pin.delete(); parts.base.delete();
}

function tileOffset(ix, iz) { return [ix * (cache.d.mod_w + params.gap), 0, iz * (cache.d.mod_h + params.gap)]; }

// each tile textured in its own GLOBAL frame -> seam-continuous across the array
function tileMesh(ix, iz) {
  const off = tileOffset(ix, iz);
  if (params.tex_on) return { mesh: texturize(cache.planterMesh, cache.d, texOpts(off)), off };
  return { mesh: cache.planterMesh, off };
}

function toBufferGeometry(mesh, off) {
  const vp = mesh.vertProperties, tv = mesh.triVerts;
  const pos = new Float32Array(vp.length);
  for (let i = 0; i < vp.length; i += 3) { pos[i] = vp[i] + off[0]; pos[i + 1] = vp[i + 1] + off[1]; pos[i + 2] = vp[i + 2] + off[2]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(tv instanceof Uint32Array ? tv : new Uint32Array(tv), 1));
  g.computeVertexNormals();
  return g;
}

function clearGroup() { for (const c of group.children) { c.geometry.dispose(); } group.clear(); }

function rebuild(regeo = true) {
  busy.style.display = 'flex';
  requestAnimationFrame(() => setTimeout(() => {
    try {
      if (regeo || !cache) buildGeometry();
      clearGroup();
      let tris = 0;
      for (let iz = 0; iz < params.nz; iz++) for (let ix = 0; ix < params.nx; ix++) {
        const { mesh, off } = tileMesh(ix, iz);
        tris += mesh.triVerts.length / 3;
        group.add(new THREE.Mesh(toBufferGeometry(mesh, off), mat));
      }
      // center the array in view
      const d = cache.d;
      const totW = (params.nx - 1) * (d.mod_w + params.gap) + d.mod_w;
      const totH = (params.nz - 1) * (d.mod_h + params.gap) + d.mod_h;
      centerOffset.set(-(totW) / 2 + d.mod_w / 2, -d.box_d / 2, -(totH) / 2 + d.mod_h / 2);
      group.position.copy(centerOffset);
      // HUD
      document.getElementById('arr').textContent = params.nx + '×' + params.nz;
      document.getElementById('tot').textContent = totW.toFixed(0) + '×' + totH.toFixed(0) + 'mm';
      document.getElementById('unit').textContent = d.mod_w.toFixed(1) + '×' + d.mod_h.toFixed(1) + '×' + d.box_d.toFixed(0);
      document.getElementById('tris').textContent = tris.toLocaleString();
    } catch (e) { alert('构建失败: ' + e.message); console.error(e); }
    busy.style.display = 'none';
  }, 10));
}

// ---- STL export -----------------------------------------------------------
function meshesToSTL(list /* [{mesh, off}] */) {
  let nt = 0; for (const it of list) nt += it.mesh.triVerts.length / 3;
  const buf = new ArrayBuffer(84 + nt * 50); const dv = new DataView(buf);
  dv.setUint32(80, nt, true); let o = 84;
  for (const it of list) {
    const vp = it.mesh.vertProperties, tv = it.mesh.triVerts, f = it.off || [0, 0, 0];
    for (let i = 0; i < tv.length; i += 3) {
      const a = tv[i] * 3, b = tv[i + 1] * 3, c = tv[i + 2] * 3;
      const P = [[vp[a] + f[0], vp[a + 1] + f[1], vp[a + 2] + f[2]], [vp[b] + f[0], vp[b + 1] + f[1], vp[b + 2] + f[2]], [vp[c] + f[0], vp[c + 1] + f[1], vp[c + 2] + f[2]]];
      let nx = (P[1][1] - P[0][1]) * (P[2][2] - P[0][2]) - (P[1][2] - P[0][2]) * (P[2][1] - P[0][1]);
      let ny = (P[1][2] - P[0][2]) * (P[2][0] - P[0][0]) - (P[1][0] - P[0][0]) * (P[2][2] - P[0][2]);
      let nz = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[1][1] - P[0][1]) * (P[2][0] - P[0][0]);
      const L = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / L, true); dv.setFloat32(o + 4, ny / L, true); dv.setFloat32(o + 8, nz / L, true); o += 12;
      for (const v of P) { dv.setFloat32(o, v[0], true); dv.setFloat32(o + 4, v[1], true); dv.setFloat32(o + 8, v[2], true); o += 12; }
      dv.setUint16(o, 0, true); o += 2;
    }
  }
  return new Blob([buf], { type: 'model/stl' });
}
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

function allTiles() {
  if (!cache) buildGeometry();
  const list = [];
  for (let iz = 0; iz < params.nz; iz++) for (let ix = 0; ix < params.nx; ix++) {
    const off = tileOffset(ix, iz);
    const mesh = params.tex_on ? texturize(cache.planterMesh, cache.d, texOpts(off)) : cache.planterMesh;
    list.push({ mesh, off });
  }
  return list;
}
function exportCombinedSTL() {
  busy.style.display = 'flex';
  setTimeout(() => { download(meshesToSTL(allTiles()), 'wall_planter_array_' + params.nx + 'x' + params.nz + '.stl'); busy.style.display = 'none'; }, 10);
}
async function exportPartsZip() {
  busy.style.display = 'flex';
  await new Promise(r => setTimeout(r, 10));
  if (!cache) buildGeometry();
  const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@${V.jszip}/+esm');
  const zip = new JSZip();
  // each planter as its own object, textured in its ARRAY frame but written at origin,
  // so reassembling the pieces in the array reproduces the seamless texture.
  for (let iz = 0; iz < params.nz; iz++) for (let ix = 0; ix < params.nx; ix++) {
    const off = tileOffset(ix, iz);
    const mesh = params.tex_on ? texturize(cache.planterMesh, cache.d, texOpts(off)) : cache.planterMesh;
    zip.file('planter_r' + iz + '_c' + ix + '.stl', await meshesToSTL([{ mesh, off: [0, 0, 0] }]).arrayBuffer());
  }
  zip.file('connector.stl', await meshesToSTL([{ mesh: cache.connectorMesh }]).arrayBuffer());
  zip.file('pin.stl', await meshesToSTL([{ mesh: cache.pinMesh }]).arrayBuffer());
  zip.file('base.stl', await meshesToSTL([{ mesh: cache.baseMesh }]).arrayBuffer());
  const blob = await zip.generateAsync({ type: 'blob' });
  download(blob, 'wall_planter_parts_' + params.nx + 'x' + params.nz + '.zip');
  busy.style.display = 'none';
}

// ---- GUI ------------------------------------------------------------------
const gui = new GUI({ title: '参数' });
const fBox = gui.addFolder('盒子 / 花盆');
fBox.add(params, 'side_gap', 6, 40, 1).name('侧边距(→宽)').onFinishChange(() => rebuild());
fBox.add(params, 'box_d', 40, 120, 1).name('盒厚(进深)').onFinishChange(() => rebuild());
fBox.add(params, 'tilt', 20, 60, 1).name('花盆倾角°').onFinishChange(() => rebuild());
fBox.add(params, 'pot_height', 80, 200, 1).name('花盆总高').onFinishChange(() => rebuild());
const fLat = gui.addFolder('背板镂空');
fLat.add(params, 'back_lattice').name('开启镂空').onChange(() => rebuild());
fLat.add(params, 'lat_cell', 8, 30, 1).name('六角对边').onFinishChange(() => rebuild());
fLat.add(params, 'lat_wall', 3, 14, 0.5).name('筋宽').onFinishChange(() => rebuild());
fLat.add(params, 'lat_ydepth', 6, 66, 1).name('掏空深').onFinishChange(() => rebuild());
const fTex = gui.addFolder('表面纹理(替换式)');
fTex.add(params, 'tex_on').name('烘焙纹理').onChange(() => rebuild(false));
fTex.add(params, 'amp', 0, 3, 0.05).name('起伏幅度').onFinishChange(() => { if (params.tex_on) rebuild(false); });
fTex.add(params, 'cell', 6, 40, 1).name('折痕尺度').onFinishChange(() => { if (params.tex_on) rebuild(false); });
fTex.add(params, 'octaves', 1, 4, 1).name('倍频').onFinishChange(() => { if (params.tex_on) rebuild(false); });
fTex.add(params, 'curl', 0, 0.6, 0.02).name('卷曲占比').onFinishChange(() => { if (params.tex_on) rebuild(false); });
fTex.add(params, 'target_edge', 1.5, 5, 0.1).name('网格密度(mm)').onFinishChange(() => { if (params.tex_on) rebuild(false); });
const fArr = gui.addFolder('阵列');
fArr.add(params, 'nx', 1, 6, 1).name('列(横)').onChange(() => rebuild(false));
fArr.add(params, 'nz', 1, 6, 1).name('行(竖)').onChange(() => rebuild(false));
fArr.add(params, 'gap', 0, 30, 0.5).name('模块间距').onChange(() => rebuild(false));
const fExp = gui.addFolder('导出');
fExp.add(params, 'rebuild').name('↻ 重新构建');
fExp.add(params, 'exportCombined').name('⬇ 整列 STL(一体)');
fExp.add(params, 'exportParts').name('⬇ 拆分零件 ZIP');

addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
(function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); })();
rebuild(true);
</script>
</body>
</html>
`;

writeFileSync(new URL('./planter_configurator.html', import.meta.url), html);
console.log('wrote planter_configurator.html', html.length, 'bytes');
