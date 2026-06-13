import pathlib
import sys

# 用法: python3 build_viewer.py [planter_v5.stl]
stl_path = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "planter_v5.stl")
stl_text = stl_path.read_text()

# Safety: STL ASCII never contains "</script" but guard anyway
assert "</script" not in stl_text.lower(), "STL contains script close tag!"

html = '''<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Wall Planter v5 — 3D 预览</title>
<style>
  :root { --bg:#1a1c20; --panel:#23262c; --txt:#e6e8eb; --muted:#9aa0a8; --accent:#6cc08b; }
  * { box-sizing:border-box; }
  html,body { margin:0; height:100%; background:var(--bg); color:var(--txt);
    font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif; }
  #app { position:fixed; inset:0; }
  canvas { display:block; }
  #hud { position:fixed; top:12px; left:12px; background:rgba(35,38,44,.85);
    backdrop-filter:blur(6px); border:1px solid #33373e; border-radius:10px;
    padding:12px 14px; max-width:280px; }
  #hud h1 { margin:0 0 6px; font-size:15px; font-weight:600; }
  #hud .dim { color:var(--accent); font-variant-numeric:tabular-nums; }
  #hud .muted { color:var(--muted); font-size:12px; margin-top:8px; }
  #hud .muted kbd { background:#2e323a; border:1px solid #3a3f47; border-radius:4px;
    padding:1px 5px; font-size:11px; }
  #controls { position:fixed; bottom:12px; left:12px; display:flex; gap:8px; flex-wrap:wrap; }
  button { background:var(--panel); color:var(--txt); border:1px solid #3a3f47;
    border-radius:8px; padding:7px 12px; cursor:pointer; font-size:13px; }
  button:hover { border-color:var(--accent); color:var(--accent); }
  button.active { background:var(--accent); color:#12231a; border-color:var(--accent); }
  #loading { position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
    color:var(--muted); font-size:15px; }
</style>
</head>
<body>
<div id="app"></div>
<div id="loading">加载模型中…</div>
<div id="hud">
  <h1>Wall Planter v5</h1>
  <div>尺寸 <span class="dim" id="dims">—</span></div>
  <div class="muted">
    <kbd>拖拽</kbd> 旋转 · <kbd>滚轮</kbd> 缩放 · <kbd>右键</kbd> 平移
  </div>
</div>
<div id="controls">
  <button id="btn-rotate" class="active">自动旋转</button>
  <button id="btn-wire">线框</button>
  <button id="btn-edges">显示边</button>
  <button id="btn-reset">复位视角</button>
</div>

<script type="text/plain" id="stl-data">__STL__</script>

<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>

<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const app = document.getElementById('app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1c20);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 5000);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x444a52, 1.0));
const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(1,1.4,1); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-1,0.4,-0.8); scene.add(fill);

// Ground grid
const grid = new THREE.GridHelper(600, 30, 0x3a3f47, 0x2a2e34);
scene.add(grid);

// Parse embedded STL
const stlText = document.getElementById('stl-data').textContent;
const geometry = new STLLoader().parse(stlText);
geometry.computeVertexNormals();
geometry.computeBoundingBox();

const bbox = geometry.boundingBox;
const size = new THREE.Vector3(); bbox.getSize(size);
const center = new THREE.Vector3(); bbox.getCenter(center);

// OpenSCAD is Z-up; rotate to Y-up for nicer default view
const material = new THREE.MeshStandardMaterial({ color:0x6cc08b, metalness:0.05, roughness:0.65, flatShading:false });
const mesh = new THREE.Mesh(geometry, material);

// Pivot group so we can re-orient Z-up -> Y-up and recenter
const pivot = new THREE.Group();
mesh.geometry.translate(-center.x, -center.y, -center.z);
mesh.rotation.x = -Math.PI/2;          // Z-up to Y-up
pivot.add(mesh);
scene.add(pivot);

// Drop onto grid
const halfH = size.z/2;
pivot.position.y = halfH;

// Edges overlay
const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(geometry, 25),
  new THREE.LineBasicMaterial({ color:0x12231a })
);
edges.rotation.x = -Math.PI/2;
edges.visible = false;
pivot.add(edges);

document.getElementById('dims').textContent =
  `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} mm`;

// Frame camera
const maxDim = Math.max(size.x, size.y, size.z);
const dist = maxDim * 2.0;
const home = new THREE.Vector3(dist*0.8, dist*0.7, dist*0.9);
function resetView(){
  camera.position.copy(home);
  controls.target.set(0, halfH, 0);
  controls.update();
}
resetView();

document.getElementById('loading').remove();

// UI
const btnRotate = document.getElementById('btn-rotate');
const btnWire = document.getElementById('btn-wire');
const btnEdges = document.getElementById('btn-edges');
btnRotate.onclick = () => { controls.autoRotate = !controls.autoRotate; btnRotate.classList.toggle('active', controls.autoRotate); };
btnWire.onclick = () => { material.wireframe = !material.wireframe; btnWire.classList.toggle('active', material.wireframe); };
btnEdges.onclick = () => { edges.visible = !edges.visible; btnEdges.classList.toggle('active', edges.visible); };
document.getElementById('btn-reset').onclick = resetView;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
})();
</script>
</body>
</html>
'''

html = html.replace("__STL__", stl_text)
out = pathlib.Path("viewer.html")
out.write_text(html)
print(f"Wrote {out} ({len(html)} bytes)")
