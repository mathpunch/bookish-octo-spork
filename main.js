// Apollo: Lunar Nightmare - Minimal Three.js Horror Game

let scene, camera, renderer, controls;
let player = { x: 0, y: 2, z: 10, yaw: 0, pitch: 0 };
let keys = {};
let monster, radioTower, rocket, oxygen = 100, gameOver = false, repairing = false, radioFixed = false, rocketFixed = false;
let lastOxygenTick = Date.now();
let lastMonsterSound = 0;
let hudOxygen = document.getElementById('oxygen');
let hudObj = document.getElementById('objective');
let hudMsg = document.getElementById('message');

// Sound
let radioStatic = new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_124bfa6e3e.mp3');
radioStatic.loop = true; radioStatic.volume = 0.15;
let jumpscare = new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_124bfa6e3e.mp3'); // Placeholder

function clamp(a, b, c) { return Math.max(b, Math.min(c, a)); }

init();
animate();

function init() {
  // Setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Moon surface
  let ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120,120,32,32),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1, metalness: 0.1 })
  );
  ground.rotation.x = -Math.PI/2; scene.add(ground);

  // Crater rocks (random spheres)
  for (let i=0;i<30;i++) {
    let mesh = new THREE.Mesh(
      new THREE.SphereGeometry(Math.random()*0.8+0.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x222222, flatShading: true })
    );
    mesh.position.set(Math.random()*100-50,0.2,Math.random()*100-50);
    scene.add(mesh);
  }

  // Radio Tower (cylinder + box)
  radioTower = new THREE.Group();
  let tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5,0.6,6,8),
    new THREE.MeshStandardMaterial({ color: 0xcccccc })
  );
  tower.position.y = 3;
  radioTower.add(tower);
  let dish = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 8, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xaaaaee })
  );
  dish.scale.y = 0.35; dish.position.y = 6; dish.rotation.x = Math.PI/2;
  radioTower.add(dish);
  radioTower.position.set(20,0,0);
  scene.add(radioTower);

  // Rocket (capsule + cone)
  rocket = new THREE.Group();
  let body = new THREE.Mesh(
    new THREE.CylinderGeometry(1,1,5,12),
    new THREE.MeshStandardMaterial({ color: 0xdddddd })
  );
  body.position.y = 2.5;
  rocket.add(body);
  let nose = new THREE.Mesh(
    new THREE.ConeGeometry(1,2,12),
    new THREE.MeshStandardMaterial({ color: 0xbbbbee })
  );
  nose.position.y = 6;
  rocket.add(nose);
  rocket.position.set(-25,0,-10);
  scene.add(rocket);

  // Monster (red glowing sphere)
  monster = new THREE.Mesh(
    new THREE.SphereGeometry(1.3, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0x990000, emissiveIntensity: 0.5 })
  );
  monster.position.set(15,1,-30);
  scene.add(monster);

  // Light
  let moonlight = new THREE.PointLight(0xffffff, 1.2, 160);
  moonlight.position.set(0,40,0); scene.add(moonlight);
  let pLight = new THREE.PointLight(0xffffff, 0.3, 30);
  camera.add(pLight);
  scene.add(camera);

  // Event listeners
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', e => { keys[e.code] = true; });
  document.addEventListener('keyup', e => { keys[e.code] = false; });
  document.body.addEventListener('click', () => { document.body.requestPointerLock(); });

  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement === document.body && !gameOver) {
      player.yaw -= e.movementX * 0.002;
      player.pitch -= e.movementY * 0.002;
      player.pitch = clamp(player.pitch, -Math.PI/2, Math.PI/2);
    }
  });
  document.addEventListener('keypress', onInteraction);

  // Start radio static after user interacts
  document.body.addEventListener('click', () => { if(radioStatic.paused) radioStatic.play(); }, { once:true });
}

function onInteraction(e) {
  if (gameOver) return;
  // E to interact/repair
  if (e.code === 'KeyE' || e.key === 'e') {
    // Radio tower repair
    if (!radioFixed && distToObj(radioTower) < 3) {
      repairing = true;
      hudMsg.innerText = "Repairing radio...";
      setTimeout(() => {
        radioFixed = true;
        repairing = false;
        hudMsg.innerText = "";
        hudObj.innerText = "Objective: Repair the rocket";
      }, 2000);
    }
    // Rocket repair
    if (radioFixed && !rocketFixed && distToObj(rocket) < 3) {
      repairing = true;
      hudMsg.innerText = "Repairing rocket...";
      setTimeout(() => {
        rocketFixed = true;
        repairing = false;
        hudMsg.innerText = "";
        hudObj.innerText = "Objective: Get to the rocket and escape!";
      }, 2200);
    }
    // Escape
    if (radioFixed && rocketFixed && distToObj(rocket) < 3) {
      gameOver = true;
      hudMsg.innerText = "You escape! ...but what followed you back?";
      radioStatic.pause();
      setTimeout(()=>window.location.reload(), 8000);
    }
  }
}

function distToObj(obj) {
  let p = new THREE.Vector3(player.x, 0, player.z);
  let o = new THREE.Vector3().copy(obj.position);
  o.y = 0;
  return p.distanceTo(o);
}

function animate() {
  requestAnimationFrame(animate);

  // Oxygen
  if (!gameOver && Date.now() - lastOxygenTick > 1000) {
    lastOxygenTick = Date.now();
    if (!repairing) oxygen -= 1;
    hudOxygen.innerText = `Oxygen: ${Math.max(0,Math.floor(oxygen))}%`;
    if (oxygen < 1 && !gameOver) {
      gameOver = true;
      hudMsg.innerText = "You suffocated on the moon.";
      radioStatic.pause();
      setTimeout(()=>window.location.reload(), 7000);
    }
  }

  // Player movement
  if (!gameOver && !repairing) {
    let moveSpeed = 0.17, dx=0, dz=0;
    let yaw = player.yaw, pitch = player.pitch;
    if (keys['KeyW']) { dx += Math.sin(yaw)*moveSpeed; dz += Math.cos(yaw)*moveSpeed*-1; }
    if (keys['KeyS']) { dx -= Math.sin(yaw)*moveSpeed; dz -= Math.cos(yaw)*moveSpeed*-1; }
    if (keys['KeyA']) { dx += Math.sin(yaw-Math.PI/2)*moveSpeed; dz += Math.cos(yaw-Math.PI/2)*moveSpeed*-1; }
    if (keys['KeyD']) { dx += Math.sin(yaw+Math.PI/2)*moveSpeed; dz += Math.cos(yaw+Math.PI/2)*moveSpeed*-1; }
    player.x += dx; player.z += dz;
    player.x = clamp(player.x, -55, 55); player.z = clamp(player.z, -55, 55);
  }

  camera.position.set(player.x, player.y, player.z);
  camera.rotation.set(player.pitch, player.yaw, 0);

  // Monster AI: chase if close, otherwise stalk
  if (!gameOver) {
    let mx = monster.position.x, mz = monster.position.z;
    let px = player.x, pz = player.z;
    let dist = Math.hypot(mx-px,mz-pz);
    if (dist < 30) {
      // Move monster toward player
      let speed = dist<8 ? 0.13 : 0.07;
      monster.position.x += (px - mx)*speed/dist;
      monster.position.z += (pz - mz)*speed/dist;
      // Jumpscare
      if (dist < 2.1) {
        gameOver = true;
        hudMsg.innerText = "The horror found you.";
        radioStatic.pause();
        jumpscare.play();
        monster.material.emissiveIntensity = 4;
        setTimeout(()=>window.location.reload(), 7000);
      }
      // Play random monster sound sometimes
      if (Date.now() - lastMonsterSound > 4000 + Math.random()*4000) {
        lastMonsterSound = Date.now();
        radioStatic.currentTime = 0; // abrupt static
        radioStatic.volume = 0.25;
        setTimeout(()=>{radioStatic.volume=0.15;}, 300);
      }
    }
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
