import Module from 'manifold-3d';
import { build } from './geometry.mjs';
import { texturize } from './texture.mjs';
import { writeFileSync } from 'fs';
const wasm = await Module(); wasm.setup();
const { Manifold } = wasm;

function meshToSTL(path, meshes /* [{vertProperties,triVerts, off}] */) {
  let nt = 0; for (const m of meshes) nt += m.triVerts.length/3;
  const buf = Buffer.alloc(84 + nt*50); buf.writeUInt32LE(nt,80); let o=84;
  for (const m of meshes){ const vp=m.vertProperties, tv=m.triVerts, off=m.off||[0,0,0];
    for (let i=0;i<tv.length;i+=3){ const a=tv[i]*3,b=tv[i+1]*3,c=tv[i+2]*3;
      const P=[[vp[a]+off[0],vp[a+1]+off[1],vp[a+2]+off[2]],[vp[b]+off[0],vp[b+1]+off[1],vp[b+2]+off[2]],[vp[c]+off[0],vp[c+1]+off[1],vp[c+2]+off[2]]];
      let nx=(P[1][1]-P[0][1])*(P[2][2]-P[0][2])-(P[1][2]-P[0][2])*(P[2][1]-P[0][1]);
      let ny=(P[1][2]-P[0][2])*(P[2][0]-P[0][0])-(P[1][0]-P[0][0])*(P[2][2]-P[0][2]);
      let nz=(P[1][0]-P[0][0])*(P[2][1]-P[0][1])-(P[1][1]-P[0][1])*(P[2][0]-P[0][0]);
      const L=Math.hypot(nx,ny,nz)||1; buf.writeFloatLE(nx/L,o);buf.writeFloatLE(ny/L,o+4);buf.writeFloatLE(nz/L,o+8);o+=12;
      for(const v of P){buf.writeFloatLE(v[0],o);buf.writeFloatLE(v[1],o+4);buf.writeFloatLE(v[2],o+8);o+=12;} buf.writeUInt16LE(0,o);o+=2; } }
  writeFileSync(path, buf); return nt;
}

const { planter, d } = build(Manifold, {});
const mesh = planter.getMesh();
console.log('planter mesh: numProp', mesh.numProp, 'verts', mesh.vertProperties.length/mesh.numProp, 'tris', mesh.triVerts.length/3);
const t0=Date.now();
const tex = texturize({vertProperties:mesh.vertProperties, triVerts:mesh.triVerts}, d, { amp:1.6 });
console.log('textured in', Date.now()-t0,'ms; tris', tex.triVerts.length/3, 'textured-faces', tex.textured.reduce((a,b)=>a+b,0));
meshToSTL('/tmp/tex_one.stl', [tex]);

// seam test: tile A at x-offset 0, tile B at x-offset mod_w; texture each in global frame
const texA = texturize({vertProperties:mesh.vertProperties, triVerts:mesh.triVerts}, d, { amp:1.6, offset:[0,0,0] });
const texB = texturize({vertProperties:mesh.vertProperties, triVerts:mesh.triVerts}, d, { amp:1.6, offset:[d.mod_w,0,0] });
meshToSTL('/tmp/tex_pair.stl', [texA, {...texB, off:[d.mod_w,0,0]}]);
console.log('wrote /tmp/tex_one.stl /tmp/tex_pair.stl');
