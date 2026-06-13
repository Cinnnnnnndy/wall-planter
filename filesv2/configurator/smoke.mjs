import Module from 'manifold-3d';
const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;
const box = Manifold.cube([20,20,20], true);
const cyl = Manifold.cylinder(24, 6, 6, 48, true);
const res = Manifold.difference(box, cyl);
const m = res.getMesh();
const nv = m.vertProperties.length/3, nt = m.triVerts.length/3;
console.log('manifold OK: verts', nv, 'tris', nt, 'volume', res.volume().toFixed(1), 'genus', res.genus());
// write a tiny binary STL to prove export
import { writeFileSync } from 'fs';
const vp = m.vertProperties, tv = m.triVerts;
const buf = Buffer.alloc(84 + nt*50);
buf.writeUInt32LE(nt, 80);
let o = 84;
for (let i=0;i<tv.length;i+=3){
  for (let k=0;k<3;k++){ buf.writeFloatLE(0,o); o+=4; } // normal (0, slicer recomputes)
  for (let k=0;k<3;k++){ const vi=tv[i+k]*3; buf.writeFloatLE(vp[vi],o);buf.writeFloatLE(vp[vi+1],o+4);buf.writeFloatLE(vp[vi+2],o+8); o+=12; }
  buf.writeUInt16LE(0,o); o+=2;
}
writeFileSync('/tmp/smoke.stl', buf);
console.log('wrote /tmp/smoke.stl', buf.length, 'bytes');
