import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCity, normalizeConfig, DEFAULT_CONFIG, PRESETS, serializeCity, configFromDocument } from '../src/generator.js';
import { randomStream, hashSeed } from '../src/random.js';
import { Traffic } from '../src/traffic.js';

test('a seed and settings reproduce all road, parcel and detail data', () => {
  const first = generateCity(DEFAULT_CONFIG), second = generateCity({ ...DEFAULT_CONFIG });
  assert.deepEqual(second, first);
  assert.notDeepEqual(generateCity({ ...DEFAULT_CONFIG, seed: 'OTHER-BANK' }).buildings, first.buildings);
});

test('the road graph reaches every intersection, including both banks', () => {
  for (let size = 4; size <= 7; size++) {
    const city = generateCity({ size });
    const seen = new Set([0]), queue = [0];
    for (let i=0; i<queue.length; i++) for (const next of city.roads.nodes[queue[i]].neighbors) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    assert.equal(seen.size, city.roads.nodes.length);
    assert.equal(city.roads.bridges.length, 3);
    for (const edge of city.roads.edges) {
      const a=city.roads.nodes[edge.a], b=city.roads.nodes[edge.b];
      assert.ok(a.x === b.x || a.z === b.z, 'roads must be axis aligned');
      assert.ok(a.neighbors.includes(b.id) && b.neighbors.includes(a.id), 'roads are bidirectional');
      if (a.x * b.x < 0) assert.ok(edge.bridge, 'the river can only be crossed on a bridge');
      assert.ok(edge.length > 0);
    }
  }
});

test('all building footprints stay inside their block setbacks and off the river', () => {
  for (let n=0; n<45; n++) {
    const city=generateCity({ seed:`bounds-${n}`, size:4+n%4, density:100, height:100 });
    const blocks=new Map(city.blocks.map(b=>[b.id,b]));
    for (const b of city.buildings) {
      const block=blocks.get(b.block);
      assert.equal(block.kind,'built');
      assert.ok(b.x-b.width/2>block.x0+3 && b.x+b.width/2<block.x1-3);
      assert.ok(b.z-b.depth/2>block.z0+3 && b.z+b.depth/2<block.z1-3);
      assert.ok(Math.abs(b.x)-b.width/2>17);
      assert.ok(b.width>0 && b.depth>0 && b.height>0 && Number.isInteger(b.floors));
    }
  }
});

test('parcel footprints never overlap each other', () => {
  for (const config of Object.values(PRESETS)) {
    const city=generateCity({ ...config, density:100 });
    for (let i=0; i<city.buildings.length; i++) for (let j=i+1; j<city.buildings.length; j++) {
      const a=city.buildings[i],b=city.buildings[j];
      assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2 || Math.abs(a.z-b.z)>=(a.depth+b.depth)/2);
    }
  }
});

test('visual generation parameters leave the street graph unchanged', () => {
  const a=generateCity({ seed:'stable-streets',density:35,height:15,greenery:60 });
  const b=generateCity({ seed:'stable-streets',density:100,height:100,greenery:5 });
  assert.deepEqual(a.roads,b.roads);
  assert.deepEqual(a.cuts,b.cuts);
  assert.ok(b.stats.buildings>a.stats.buildings);
  assert.ok(b.stats.tallest>a.stats.tallest);
  assert.ok(a.stats.parks>b.stats.parks);
});

test('size creates the requested block count and a guaranteed civic park', () => {
  for (let size=4;size<=7;size++) {
    const city=generateCity({ size });
    assert.equal(city.blocks.length,size*(size>=7?4:3)*2);
    assert.equal(city.blocks.filter(b=>b.civic).length,1);
    assert.equal(city.blocks.find(b=>b.civic).kind,'park');
  }
});

test('statistics match actual generated data', () => {
  const city=generateCity();
  assert.equal(city.stats.buildings,city.buildings.length);
  assert.equal(city.stats.trees,city.trees.length);
  assert.equal(city.stats.parks,city.blocks.filter(b=>b.kind==='park').length);
  assert.equal(city.stats.tallest,Math.round(Math.max(...city.buildings.map(b=>b.height))));
  assert.equal(new Set(city.buildings.map(b=>b.id)).size,city.buildings.length);
});

test('JSON export/import regenerates the same complete plan', () => {
  const city=generateCity(PRESETS.downtown);
  const doc=JSON.parse(serializeCity(city));
  assert.deepEqual(generateCity(configFromDocument(doc)),city);
  // Imported geometry is untrusted and ignored; only bounded settings are accepted.
  doc.buildings=[{ width:Infinity }];
  assert.deepEqual(generateCity(configFromDocument(doc)),city);
  assert.throws(()=>configFromDocument({ version:2,format:'blockline-city',config:{} }));
  assert.throws(()=>configFromDocument(null));
});

test('settings reject malformed data and cap expensive requests', () => {
  assert.throws(()=>normalizeConfig({ seed:'' }));
  assert.throws(()=>normalizeConfig({ seed:'x'.repeat(65) }));
  for (const invalid of [NaN,Infinity,'many',null]) assert.throws(()=>normalizeConfig({ size:invalid }));
  assert.throws(()=>normalizeConfig([]));
  assert.equal(normalizeConfig({ size:1e6 }).size,7);
  assert.equal(normalizeConfig({ density:-1e6 }).density,35);
  assert.equal(normalizeConfig({ seed:'  Harbor  ' }).seed,'Harbor');
});

test('random streams are independent, bounded and repeatable for Unicode seeds', () => {
  const a=randomStream('岸-062'),b=randomStream('岸-062');
  assert.equal(hashSeed('岸-062'),hashSeed('岸-062'));
  for(let i=0;i<500;i++){const n=a();assert.ok(n>=0&&n<1);assert.equal(n,b());}
});

test('ambient cars stay on a connected edge, with a fixed lane offset', () => {
  const city=generateCity(),traffic=new Traffic(city,60);
  for(let tick=0;tick<1300;tick++){
    for(const car of traffic.update(.05)){
      const a=city.roads.nodes[car.from],b=city.roads.nodes[car.to];
      assert.ok(a.neighbors.includes(car.to));
      assert.ok(car.progress>=0&&car.progress<1);
      assert.ok(Number.isFinite(car.x)&&Number.isFinite(car.z));
      const cross=(car.x-a.x)*(b.z-a.z)-(car.z-a.z)*(b.x-a.x);
      const distance=Math.abs(cross)/Math.hypot(b.x-a.x,b.z-a.z);
      assert.ok(Math.abs(distance-.83)<1e-8);
    }
  }
});

test('paused traffic has no drift and long frame gaps remain bounded', () => {
  const city=generateCity(),traffic=new Traffic(city,10);
  traffic.update(0);const before=structuredClone(traffic.cars);
  traffic.update(0);assert.deepEqual(traffic.cars,before);
  traffic.update(10000);
  for(const car of traffic.cars)assert.ok(car.progress>=0&&car.progress<1);
});
