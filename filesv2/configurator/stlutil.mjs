import { writeFileSync } from 'fs';
export function writeBinarySTL(path, manifold) {
  const m = manifold.getMesh();
  const vp = m.vertProperties, tv = m.triVerts, nt = tv.length / 3;
  const buf = Buffer.alloc(84 + nt * 50);
  buf.writeUInt32LE(nt, 80);
  let o = 84;
  for (let i = 0; i < tv.length; i += 3) {
    const a = tv[i]*3, b = tv[i+1]*3, c = tv[i+2]*3;
    const ux=vp[b]-vp[a], uy=vp[b+1]-vp[a+1], uz=vp[b+2]-vp[a+2];
    const vx=vp[c]-vp[a], vy=vp[c+1]-vp[a+1], vz=vp[c+2]-vp[a+2];
    let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
    const L=Math.hypot(nx,ny,nz)||1; nx/=L;ny/=L;nz/=L;
    buf.writeFloatLE(nx,o);buf.writeFloatLE(ny,o+4);buf.writeFloatLE(nz,o+8);o+=12;
    for (const vi of [a,b,c]){ buf.writeFloatLE(vp[vi],o);buf.writeFloatLE(vp[vi+1],o+4);buf.writeFloatLE(vp[vi+2],o+8);o+=12; }
    buf.writeUInt16LE(0,o);o+=2;
  }
  writeFileSync(path, buf);
  return nt;
}
