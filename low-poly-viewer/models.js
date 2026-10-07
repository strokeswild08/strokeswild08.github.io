import * as THREE from './vendor/three.module.min.js';

// Each demo is assembled from simple, editable shapes. No downloaded art assets.
function material(color) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.88 });
}

function addMesh(group, geometry, color, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function box(group, size, color, position, rotation) {
  return addMesh(group, new THREE.BoxGeometry(...size), color, position, rotation);
}

function rock(group, size, position, color = '#849489') {
  const mesh = addMesh(group, new THREE.IcosahedronGeometry(1, 0), color, position);
  mesh.scale.set(...size);
  mesh.rotation.set(0.14, position[0] * 1.3, 0.12);
  return mesh;
}

function pine(group, x, z, height, tint) {
  addMesh(group, new THREE.CylinderGeometry(.10, .15, height * .5, 5), '#7e6850', [x, height * .25 + .38, z]);
  for (let layer = 0; layer < 3; layer++) {
    const radius = height * (.29 - layer * .055);
    addMesh(group, new THREE.ConeGeometry(radius, height * .57, 7), tint[layer], [x, .65 + height * (.28 + layer * .19), z], [0, layer * .2, 0]);
  }
}

function roof(group, width, depth, bottomY, topY, x, z) {
  const points = [
    [x-width/2,bottomY,z-depth/2],[x+width/2,bottomY,z-depth/2],[x,topY,z-depth/2],
    [x-width/2,bottomY,z+depth/2],[x,topY,z+depth/2],[x+width/2,bottomY,z+depth/2]
  ];
  const faces = [[0,1,2],[3,4,5],[0,2,4],[0,4,3],[2,1,5],[2,5,4],[0,3,5],[0,5,1]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(faces.flatMap(face => face.flatMap(index => points[index])), 3));
  geometry.computeVertexNormals();
  return addMesh(group, geometry, '#a96343');
}

export function createOutpost() {
  const group = new THREE.Group();
  group.name = 'Woodland outpost';
  addMesh(group, new THREE.CylinderGeometry(4.2, 3.7, .75, 9), '#737e65', [0,.03,0]);
  addMesh(group, new THREE.CylinderGeometry(4.18, 4.2, .15, 9), '#9caa75', [0,.45,0]);
  addMesh(group, new THREE.CylinderGeometry(2.8, 3.4, .35, 7), '#58634f', [.15,-.44,0], [0,.19,0]);
  const houseX = -.65, houseZ = -.3;
  box(group, [2.15,1.85,1.8], '#e2d5ac', [houseX,1.46,houseZ]);
  box(group, [2.22,.16,1.87], '#9b997f', [houseX,.66,houseZ]);
  roof(group, 2.65, 2.3, 2.4, 3.65, houseX, houseZ);
  box(group, [.34,.94,.4], '#7c8471', [.13,3.39,-.7]);
  box(group, [.43,.13,.49], '#aab099', [.13,3.86,-.7]);
  // Windows and door sit just in front of the facade to avoid flickering.
  box(group, [.53,.68,.07], '#65725e', [-1.25,1.66,.635]);
  box(group, [.39,.53,.08], '#edc581', [-1.25,1.66,.68]);
  box(group, [.04,.57,.09], '#65725e', [-1.25,1.66,.72]);
  box(group, [.42,.67,.10], '#405747', [-.37,1.15,.66]);
  box(group, [.31,.52,.12], '#77734e', [-.37,1.17,.71]);
  addMesh(group, new THREE.SphereGeometry(.045, 6, 4), '#eed5a0', [-.26,1.12,.79]);
  box(group, [.75,.15,.43], '#afb292', [-.37,.65,1.0]);
  box(group, [1.05,.13,.45], '#c1bea0', [-.37,.59,1.3]);
  // A tiny shelter off the side of the cabin.
  box(group, [.09,.9,.09], '#8b7956', [-2.3,.98,.8]);
  box(group, [.09,.9,.09], '#8b7956', [-2.3,.98,-.65]);
  box(group, [1.0,.14,1.7], '#878659', [-2.05,1.46,.05], [0,0,-.10]);
  box(group, [.45,.48,.4], '#a47c50', [-2.03,.82,.46]);
  box(group, [.42,.39,.37], '#bd9762', [-2.10,.79,-.05]);
  pine(group, -2.5,-1.8,3.9,['#496847','#567953','#6d8a59']);
  pine(group, 1.9,-2.15,3.5,['#456744','#55754d','#6e8757']);
  pine(group, 3.0,-.3,2.8,['#56784f','#6b8757','#7e9665']);
  pine(group, -3.0,.9,2.3,['#5b784d','#71894f','#879b63']);
  pine(group, 1.25,-3.0,2.15,['#567953','#668858','#7b9965']);
  const pond = addMesh(group, new THREE.CylinderGeometry(1.03,1.03,.04,8), '#75a9a5', [1.63,.555,1.35]);
  pond.scale.z = .7;
  box(group, [.62,.1,.17], '#d9cb96', [1.78,.65,.98], [0,.24,0]);
  box(group, [.13,.14,.63], '#7e724d', [1.70,.68,1.2], [0,.24,0]);
  for (let i = 0; i < 5; i++) {
    box(group, [.53,.07,.31], i%2 ? '#b7b992' : '#c3c09d', [-.35 + Math.sin(i)*.12,.58,1.64+i*.37], [0,i*.2,0]);
  }
  rock(group, [.65,.45,.5], [2.6,.79,1.78]);
  rock(group, [.44,.3,.38], [2.0,.69,2.53], '#9ea58a');
  rock(group, [.52,.4,.5], [-1.99,.75,2.17], '#8e9a83');
  rock(group, [.32,.25,.3], [-2.45,.64,2.38], '#a4ad8d');
  for (const [x,z] of [[.4,2.8],[-1.8,1.55],[2.7,-1.3],[-.2,-2.8]]) {
    const grass = addMesh(group, new THREE.ConeGeometry(.12,.5,3), '#6a8251', [x,.73,z]);
    grass.rotation.z = -.12;
  }
  // Fence and hanging trail sign.
  for (const z of [1.7,2.3,2.9]) box(group, [.10,.60,.10], '#887b58', [-1.35,.84,z]);
  box(group, [.08,.12,1.4], '#b0a078', [-1.35,.92,2.3]);
  box(group, [.11,1.1,.11], '#827b53', [.75,1.07,2.9]);
  box(group, [.77,.32,.12], '#c1ab77', [.99,1.45,2.9], [0,0,-.06]);
  box(group, [.15,.09,.14], '#576647', [1.10,1.45,2.98]);
  return group;
}

export function createRobot() {
  const group = new THREE.Group();
  group.name = 'Copper courier';
  addMesh(group, new THREE.CylinderGeometry(1.5,1.62,.3,8), '#778b7a', [0,.15,0]);
  addMesh(group, new THREE.CylinderGeometry(1.51,1.51,.05,8), '#9aac8a', [0,.325,0]);
  for (const side of [-1,1]) {
    box(group, [.46,.28,.76], '#445955', [side*.43,.49,.18]);
    box(group, [.29,.7,.32], '#ad7850', [side*.43,.95,0], [0,0,side*.06]);
    addMesh(group, new THREE.CylinderGeometry(.19,.19,.36,8), '#56716b', [side*.43,1.02,.025], [Math.PI/2,0,0]);
  }
  box(group, [1.30,1.22,.82], '#bb885d', [0,1.80,0], [0,0,-.03]);
  box(group, [1.09,.90,.09], '#d09b69', [0,1.82,.47]);
  box(group, [.38,.33,.10], '#4a665e', [.18,1.97,.54]);
  addMesh(group, new THREE.SphereGeometry(.07,8,4), '#e9d592', [-.33,1.94,.56]);
  addMesh(group, new THREE.SphereGeometry(.07,8,4), '#67917c', [-.33,1.72,.56]);
  box(group, [.88,.73,.43], '#637759', [0,1.89,-.58]);
  box(group, [1.08,.15,.47], '#819275', [0,2.3,-.60]);
  box(group, [.12,.82,.11], '#466453', [-.43,1.9,-.28]);
  box(group, [.12,.82,.11], '#466453', [.43,1.9,-.28]);
  addMesh(group, new THREE.CylinderGeometry(.22,.22,.3,8), '#475d56', [0,2.53,0]);
  box(group, [1.32,.90,.96], '#c69869', [0,3.07,.03], [0,-.14,0]);
  const face = new THREE.Group();
  face.position.set(0,3.09,.06);
  face.rotation.y = -.14;
  box(face, [1.04,.52,.08], '#35534e', [0,0,.47]);
  for (const side of [-1,1]) box(face, [.18,.15,.09], '#d7e9ad', [side*.26,.055,.52]);
  box(face, [.27,.035,.09], '#93b3a0', [0,-.14,.52]);
  group.add(face);
  addMesh(group, new THREE.CylinderGeometry(.047,.047,.53,5), '#617a64', [.33,3.77,-.03], [0,0,-.15]);
  addMesh(group, new THREE.IcosahedronGeometry(.13,0), '#e1b668', [.37,4.04,-.03]);
  for (const side of [-1,1]) {
    addMesh(group, new THREE.SphereGeometry(.23,8,4), '#49665c', [side*.80,2.12,0]);
    box(group, [.28,.78,.32], '#ad784e', [side*.93,1.81,.03], [0,0,side*.28]);
    addMesh(group, new THREE.SphereGeometry(.22,6,4), '#5f7a69', [side*1.03,1.40,.03]);
    box(group, [.22,.15,.32], '#d1a277', [side*1.08,1.30,.20]);
  }
  // A scarf keeps the silhouette from reading as a stack of boxes.
  box(group, [1.37,.19,.92], '#6e9b8b', [0,2.40,.02]);
  box(group, [.31,.7,.10], '#79aa96', [-.42,2.02,.60], [0,0,-.15]);
  rock(group, [.24,.18,.21], [-1.10,.48,.80], '#acb59a');
  rock(group, [.16,.12,.16], [1.15,.43,.7], '#b8b99a');
  return group;
}
