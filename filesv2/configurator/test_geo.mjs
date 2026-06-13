import Module from 'manifold-3d';
import { build } from './geometry.mjs';
import { writeBinarySTL } from './stlutil.mjs';
const wasm = await Module(); wasm.setup();
const { Manifold } = wasm;
for (const [name, latt] of [['lattice-on', true], ['lattice-off', false]]) {
  const { planter, d } = build(Manifold, { back_lattice: latt });
  const bb = planter.boundingBox();
  const W = bb.max[0]-bb.min[0], D = bb.max[1]-bb.min[1], H = bb.max[2]-bb.min[2];
  console.log(`${name}: vol=${(planter.volume()/1000).toFixed(1)}cc bbox=${W.toFixed(1)}x${D.toFixed(1)}x${H.toFixed(1)} genus=${planter.genus()} mod_w=${d.mod_w.toFixed(1)} mod_h=${d.mod_h.toFixed(2)}`);
}
const { planter, connector, pin, base } = build(Manifold, {});
console.log('parts vols cc:', [planter,connector,pin,base].map(m=>(m.volume()/1000).toFixed(2)).join(' '));
writeBinarySTL('/tmp/js_planter.stl', planter);
writeBinarySTL('/tmp/js_base.stl', base);
writeBinarySTL('/tmp/js_connector.stl', connector);
console.log('wrote /tmp/js_planter.stl etc.');
