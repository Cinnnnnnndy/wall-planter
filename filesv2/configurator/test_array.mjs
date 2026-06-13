import Module from 'manifold-3d';
import { build } from './geometry.mjs';
import { texturize } from './texture.mjs';
import { writeFileSync } from 'fs';
const wasm = await Module(); wasm.setup(); const { Manifold } = wasm;
const { planter, d } = build(Manifold, {});
const pm = { vertProperties: planter.getMesh().vertProperties, triVerts: planter.getMesh().triVerts };
const NX=3, NZ=3, gap=0;
const tiles=[];
const t0=Date.now();
for (let iz=0; iz<NZ; iz++) for (let ix=0; ix<NX; ix++){
  const off=[ix*(d.mod_w+gap),0,iz*(d.mod_h+gap)];
  tiles.push({mesh: texturize(pm, d, {offset:off, amp:1.6}), off});
}
console.log(`textured ${NX}x${NZ} in ${Date.now()-t0}ms`);
// combine -> binary STL
let nt=0; for(const t of tiles) nt+=t.mesh.triVerts.length/3;
const buf=Buffer.alloc(84+nt*50); buf.writeUInt32LE(nt,80); let o=84;
for(const t of tiles){ const vp=t.mesh.vertProperties, tv=t.mesh.triVerts, f=t.off;
  for(let i=0;i<tv.length;i+=3){ const a=tv[i]*3,b=tv[i+1]*3,c=tv[i+2]*3;
    const P=[[vp[a]+f[0],vp[a+1]+f[1],vp[a+2]+f[2]],[vp[b]+f[0],vp[b+1]+f[1],vp[b+2]+f[2]],[vp[c]+f[0],vp[c+1]+f[1],vp[c+2]+f[2]]];
    let nx=(P[1][1]-P[0][1])*(P[2][2]-P[0][2])-(P[1][2]-P[0][2])*(P[2][1]-P[0][1]);
    let ny=(P[1][2]-P[0][2])*(P[2][0]-P[0][0])-(P[1][0]-P[0][0])*(P[2][2]-P[0][2]);
    let nz=(P[1][0]-P[0][0])*(P[2][1]-P[0][1])-(P[1][1]-P[0][1])*(P[2][0]-P[0][0]);
    const L=Math.hypot(nx,ny,nz)||1; buf.writeFloatLE(nx/L,o);buf.writeFloatLE(ny/L,o+4);buf.writeFloatLE(nz/L,o+8);o+=12;
    for(const v of P){buf.writeFloatLE(v[0],o);buf.writeFloatLE(v[1],o+4);buf.writeFloatLE(v[2],o+8);o+=12;} buf.writeUInt16LE(0,o);o+=2; } }
writeFileSync('/tmp/array33.stl', buf);
console.log('wrote /tmp/array33.stl tris', nt, 'totalW', (NX*d.mod_w).toFixed(0), 'totalH', (NZ*d.mod_h).toFixed(0));
