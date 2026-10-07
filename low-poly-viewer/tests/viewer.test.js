import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import { createOutpost, createRobot } from '../models.js';
import { inspectModel, normalizeModel, validateFile, validateGlb, MAX_FILE_BYTES } from '../viewer-utils.js';

function glb(manifest) {
  const encoded = new TextEncoder().encode(JSON.stringify(manifest));
  const length = Math.ceil(encoded.byteLength/4)*4;
  const buffer = new ArrayBuffer(20+length);
  const view = new DataView(buffer);
  view.setUint32(0,0x46546c67,true);
  view.setUint32(4,2,true);
  view.setUint32(8,buffer.byteLength,true);
  view.setUint32(12,length,true);
  view.setUint32(16,0x4e4f534a,true);
  new Uint8Array(buffer,20).fill(32);
  new Uint8Array(buffer,20,encoded.byteLength).set(encoded);
  return buffer;
}

test('both demo models have valid, finite geometry and fit on the floor', () => {
  for (const makeModel of [createOutpost,createRobot]) {
    const root = makeModel();
    const stats = inspectModel(root);
    assert.ok(stats.triangles > 100 && stats.triangles < 10000);
    assert.ok(stats.meshes > 20);
    root.traverse(node => { if (node.isMesh) assert.ok([...node.geometry.attributes.position.array].every(Number.isFinite)); });
    const model = normalizeModel(root);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    assert.ok(Math.abs(Math.max(size.x,size.y,size.z)-7) < 1e-5);
    assert.ok(Math.abs(bounds.min.y) < 1e-5);
    assert.ok(Math.abs(center.x) < 1e-5 && Math.abs(center.z) < 1e-5);
  }
});

test('normalization preserves imported transforms and does not bake them into geometry', () => {
  const model = new THREE.Mesh(new THREE.BoxGeometry(2,4,2),new THREE.MeshBasicMaterial());
  model.position.set(12,-30,10);
  model.rotation.z = .24;
  const original = model.position.clone();
  normalizeModel(model);
  assert.deepEqual(model.position.toArray(),original.toArray());
  assert.equal(model.geometry.attributes.position.count,24);
});

test('triangle counts handle indexed, non-indexed and instanced geometry', () => {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));
  group.add(new THREE.Mesh(new THREE.BoxGeometry().toNonIndexed(),new THREE.MeshBasicMaterial()));
  group.add(new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),3));
  assert.deepEqual(inspectModel(group),{meshes:3,triangles:60});
});

test('empty geometry cannot replace a working model', () => {
  assert.throws(() => normalizeModel(new THREE.Group()),/visible geometry/);
});

test('file validation rejects wrong types, oversized files and empty files', () => {
  assert.throws(() => validateFile({name:'model.obj',size:100}),/Choose a .glb/);
  assert.throws(() => validateFile({name:'model.glb',size:MAX_FILE_BYTES+1}),/over 25 MB/);
  assert.throws(() => validateFile({name:'model.glb',size:0}),/empty/);
  assert.doesNotThrow(() => validateFile({name:'MODEL.GLB',size:1000}));
});

test('valid embedded GLB manifests are accepted', () => {
  const manifest = {asset:{version:'2.0'},buffers:[{byteLength:0}],images:[{uri:'data:image/png;base64,abcd'}]};
  assert.deepEqual(validateGlb(glb(manifest)),manifest);
});

test('local models cannot cause external buffer or texture requests', () => {
  for (const resource of ['buffers','images']) {
    for (const uri of ['https://example.com/model.bin','texture.png','//example.com/texture.png']) {
      assert.throws(() => validateGlb(glb({asset:{version:'2.0'},[resource]:[{uri}]})),/external file/);
    }
  }
});

test('unsupported compression produces a specific export hint', () => {
  for (const extension of ['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu']) {
    assert.throws(() => validateGlb(glb({asset:{version:'2.0'},extensionsUsed:[extension]})),/Re-export without/);
  }
});

test('corrupt GLB headers, truncation and invalid JSON are rejected', () => {
  assert.throws(() => validateGlb(new ArrayBuffer(10)),/incomplete/);
  const wrongMagic = glb({});
  new DataView(wrongMagic).setUint32(0,0,true);
  assert.throws(() => validateGlb(wrongMagic),/not a glTF/);
  const wrongLength = glb({});
  new DataView(wrongLength).setUint32(8,200,true);
  assert.throws(() => validateGlb(wrongLength),/length is invalid/);
  const invalidJson = glb({});
  new Uint8Array(invalidJson)[20] = 0;
  assert.throws(() => validateGlb(invalidJson),/could not be read/);
});
