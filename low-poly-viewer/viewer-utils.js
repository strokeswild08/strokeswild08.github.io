import * as THREE from './vendor/three.module.min.js';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function inspectModel(root) {
  const stats = { meshes: 0, triangles: 0 };
  root.traverse(node => {
    if (!node.isMesh) return;
    stats.meshes++;
    const count = node.geometry.index?.count ?? node.geometry.attributes.position?.count ?? 0;
    stats.triangles += Math.floor(count / 3) * (node.isInstancedMesh ? node.count : 1);
  });
  return stats;
}

// Place an arbitrary-sized model on the floor without editing its geometry.
export function normalizeModel(root, desiredSize = 7) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) throw new Error('This model has no visible geometry.');
  const size = bounds.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(longest) || longest < 1e-6) throw new Error('The model has invalid or zero-sized geometry.');
  const wrapper = new THREE.Group();
  const center = bounds.getCenter(new THREE.Vector3());
  const offset = new THREE.Group();
  offset.position.set(-center.x, -bounds.min.y, -center.z);
  offset.add(root);
  wrapper.add(offset);
  wrapper.scale.setScalar(desiredSize / longest);
  wrapper.updateMatrixWorld(true);
  return wrapper;
}

export function validateFile(file) {
  if (!file.name.toLowerCase().endsWith('.glb')) throw new Error('Choose a .glb file. Export GLB with embedded textures from Blender.');
  if (file.size > MAX_FILE_BYTES) throw new Error('That model is over 25 MB. Try a smaller export.');
  if (file.size < 20) throw new Error('This file is empty or is not a valid GLB.');
}

// Read the GLB manifest before parsing: keep the local-only promise and provide
// a useful error when a file expects unsupported compression decoders.
export function validateGlb(buffer) {
  if (buffer.byteLength < 20) throw new Error('The GLB is incomplete. Export it again.');
  const view = new DataView(buffer);
  if (view.getUint32(0,true) !== 0x46546c67 || view.getUint32(4,true) !== 2) throw new Error('This is not a glTF 2.0 binary (.glb) file.');
  if (view.getUint32(8,true) !== buffer.byteLength) throw new Error('The GLB file length is invalid. Export it again.');
  const length = view.getUint32(12,true);
  if (view.getUint32(16,true) !== 0x4e4f534a || length % 4 !== 0 || length + 20 > buffer.byteLength) throw new Error('The GLB manifest is invalid.');
  let manifest;
  try { manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)).trim()); }
  catch { throw new Error('The GLB manifest could not be read.'); }
  for (const resource of [...(manifest.buffers ?? []), ...(manifest.images ?? [])]) {
    if (resource.uri && !resource.uri.startsWith('data:')) throw new Error('This model references an external file. Export a single GLB with embedded textures.');
  }
  const compressed = new Set(['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu']);
  if ([...(manifest.extensionsRequired ?? []), ...(manifest.extensionsUsed ?? [])].some(name => compressed.has(name))) throw new Error('Re-export without Draco, Meshopt or KTX2 texture compression.');
  return manifest;
}

export function disposeModel(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach(texture => {
    texture.dispose();
    // Close loader-created ImageBitmaps when replacing a model.
    if (texture.image?.close) texture.image.close();
  });
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}
