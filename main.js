// Apollo: Lunar Nightmare - Enhanced Realism & Horror

// --- Texture URLs (royalty free/public domain) ---
const MOON_TEX = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/moon_1024.jpg"; // Bump/gray
const NOISE_TEX = "https://cdn.jsdelivr.net/gh/processing/p5.js-website@main/static/assets/learn/Noise/noise-texture.png";

// --- Audio URLs (public domain/cc0) ---
const SFX_HEART = "https://cdn.pixabay.com/audio/2022/10/16/audio_12e6a9b8d2.mp3";
const SFX_BREATH = "https://cdn.pixabay.com/audio/2022/10/16/audio_12e6bfc655.mp3";
const SFX_MONSTER = "https://cdn.pixabay.com/audio/2022/11/16/audio_128b6e4d1c.mp3";
const SFX_STATIC = "https://cdn.pixabay.com/audio/2022/07/26/audio_124bfa6e3e.mp3";
const SFX_WHISPER = "https://cdn.pixabay.com/audio/2022/11/16/audio_128b6e0f6e.mp3";

// --- Core Variables ---
let scene, camera, renderer, composer;
let player = { x: 0, y: 1.7, z: 10, yaw: 0, pitch: 0 };
let keys = {};
let monster, radioTower, rocket, oxygen = 100, gameOver = false, repairing = false, hallucinating = false, radioFixed = false, rocketFixed = false;
let lastOxygenTick = Date.now();
let lastMonsterSound = 0;
let lastHallucination = 0;
let hudOxygen = document.getElementById('oxygen');
let hudObj = document.getElementById('objective');
let hudMsg = document.getElementById('message');

let heartSFX = new Audio(SFX_HEART); heartSFX.loop = true; heartSFX.volume = 0.5;
let breathSFX = new Audio(SFX_BREATH); breathSFX.loop = true; breathSFX.volume = 0.18;
let monsterSFX = new Audio(SFX_MONSTER); monsterSFX.loop = false; monsterSFX.volume = 0.35;
let staticSFX = new Audio(SFX_STATIC); staticSFX.loop = true; staticSFX.volume = 0.14;
let whisperSFX = new Audio(SFX_WHISPER); whisperSFX.loop = false; whisperSFX.volume = 0.15;

// Helper
function clamp(a, b, c) { return Math.max(b, Math.min(c, a)); }
function dist2d(x1,z1,x2,z2) { return Math.hypot(x1-x2, z1-z2); }

init();
animate();

function init() {
  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x191a1a);
  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 150);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Realistic flat moon
  let moonTex = new THREE.TextureLoader().load(MOON_TEX);
  let moonNoise = new THREE.TextureLoader().load(NOISE_TEX);
  let ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120,120,64,64),
    new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      map: moonTex,
      bumpMap: moonTex,
      bumpScale: 1.5,
      roughness: 1,
      metalness: 0.2,
      displacementMap: moonNoise,
      displacementScale: 0.7,
    })
  );
  ground.rotation.x = -Math.PI/2; scene.add(ground);

  // Random old crates and rocks for hiding
  for (let i=0;i<30;i++) {
    let mesh = new THREE.Mesh(
      new THREE.SphereGeometry(Math.random()*0.7+0.3, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x888888, flatShading: true })
    );
    mesh.position.set(Math.random()*100-50,0.2,Math.random()*100-50);
    scene.add(mesh);
    if (Math.random() > 0.7) {
      let crate = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        new THREE.MeshStandardMaterial({ color: 0x333322 })
      );
      crate.position.set(mesh.position.x+Math.random()*2-1,0.52,mesh.position.z+Math.random()*2-1);
      crate.rotation.y = Math.random()*Math.PI;
      scene.add(crate);
    }
  }

  // Radio Tower (tall, thin, retro)
  radioTower = new THREE.Group();
  let tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35,0.45,7.2,8),
    new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.65 })
  );
  tower.position.y = 3.6;
  radioTower.add(tower);
  let dish = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 10, 10, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xaaaaff, roughness: 0.7, metalness: 0.7 })
  );
  dish.scale.y = 0.37; dish.position.y = 7; dish.rotation.x = Math.PI/2;
  radioTower.add(dish);
  radioTower.position.set(18,0,-8);
  scene.add(radioTower);

  // Rocket (old, 60s style)
  rocket = new THREE.Group();
  let body = new THREE.Mesh(
    new THREE.CylinderGeometry(1,1,6,12),
    new THREE.MeshStandardMaterial({ color: 0xd5d5d5, roughness: 0.75 })
  );
  body.position.y = 3;
  rocket.add(body);
  let nose = new THREE.Mesh(
    new THREE.ConeGeometry(1,1.8,12),
    new THREE.MeshStandardMaterial({ color: 0xccccff })
  );
  nose.position.y = 6.9;
  rocket.add(nose);
  rocket.position.set(-19,0,-15);
  scene.add(rocket);

  // Monster (horrific, flickering, elongated, ghostly, only visible sometimes)
  monster = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      emissive: 0xddddaa,
      transparent: true,
      opacity: 0.23,
      roughness: 0.7,
      metalness: 0.05,
    })
  );
  monster.position.set(12,1,-55);
  scene.add(monster);

  // Monster "eyes"
  let eyeL = new THREE.Mesh(
    new THREE.SphereGeometry(0.13,10,10),
    new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff4444, emissiveIntensity: 1 })
  );
  eyeL.position.set(-0.29,0.27,1.3); monster.add(eyeL);
  let eyeR = eyeL.clone(); eyeR.position.x = 0.29; monster.add(eyeR);

  // Light (weak, directional)
  let moonlight = new THREE.DirectionalLight(0xf8f8e8, 1.45);
  moonlight.position.set(-16,40,12); scene.add(moonlight);
  let pLight = new THREE.PointLight(0xffffff, 0.25, 12);
  camera.add(pLight); scene.add(camera);

  // Post FX: CRT/old film
  composer = new THREE.EffectComposer(renderer);
  let renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  let filmPass = new THREE.ShaderPass(THREE.FilmShader);
  filmPass.uniforms['grayscale'].value = 1;
  filmPass.uniforms['nIntensity'].value = 0.27;
  filmPass.uniforms['sIntensity'].value = 0.23;
  filmPass.uniforms['sCount'].value = 600;
  composer.addPass(filmPass);

  // Events
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', e => { keys[e.code] = true; });
  document.addEventListener('keyup', e => { keys[e.code] = false; });
  document.body.addEventListener('click', () => { document.body.requestPointerLock(); });
  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement === document.body && !gameOver && !hallucinating) {
      player.yaw -= e.movementX * 0.0015;
      player.pitch -= e.movementY * 0.0012;
      player.pitch = clamp(player.pitch, -Math.PI/2+0.09, Math.PI/2-0.09);
    }
  });
  document.addEventListener('keypress', onInteraction);

  // Start looping SFX on first click
  document.body.addEventListener('click', () => {
    if(staticSFX.paused) staticSFX.play();
    if(heartSFX.paused) heartSFX.play();
    if(breathSFX.paused) breathSFX.play();
  }, { once:true });
}

function onInteraction(e) {
  if (gameOver || hallucinating) return;
  // E to repair/interact
  if (e.code === 'KeyE' || e.key === 'e') {
    if (!radioFixed && distToObj(radioTower) < 2.7) {
      repairing = true;
      hudMsg.innerText = "Fixing radio..."; staticSFX.volume = 0.25;
      setTimeout(() => {
        radioFixed = true; repairing = false; staticSFX.volume = 0.14;
        hudMsg.innerText = ""; hudObj.innerText = "Objective: Repair the rocket";
        hallucinate("A whisper: \"It doesn't want you to leave...\"");
      }, 2600);
    }
    if (radioFixed && !rocketFixed && distToObj(rocket) < 2.7) {
      repairing = true;
      hudMsg.innerText = "Repairing rocket...";
      setTimeout(() => {
        rocketFixed = true; repairing = false;
        hudMsg.innerText = ""; hudObj.innerText = "Objective: Get to the rocket and escape!";
        hallucinate("A voice on the radio: \"Don't look behind you.\"");
      }, 2500);
    }
    if (radioFixed && rocketFixed && distToObj(rocket) < 2.7) {
      endGame("You escape! ...but what followed you back?");
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
  if (!gameOver && !hallucinating && Date.now() - lastOxygenTick > 1000) {
    lastOxygenTick = Date.now();
    if (!repairing) oxygen -= 1.1;
    hudOxygen.innerText = `Oxygen: ${Math.max(0,Math.floor(oxygen))}%`;
    if (oxygen < 1 && !gameOver) {
      endGame("You suffocated on the moon.");
    }
  }

  // Player movement
  if (!gameOver && !repairing && !hallucinating) {
    let moveSpeed = 0.12, dx=0, dz=0;
    let yaw = player.yaw, pitch = player.pitch;
    if (keys['KeyW']) { dx += Math.sin(yaw)*moveSpeed; dz += Math.cos(yaw)*moveSpeed*-1; }
    if (keys['KeyS']) { dx -= Math.sin(yaw)*moveSpeed; dz -= Math.cos(yaw)*moveSpeed*-1; }
    if (keys['KeyA']) { dx += Math.sin(yaw-Math.PI/2)*moveSpeed; dz += Math.cos(yaw-Math.PI/2)*moveSpeed*-1; }
    if (keys['KeyD']) { dx += Math.sin(yaw+Math.PI/2)*moveSpeed; dz += Math.cos(yaw+Math.PI/2)*moveSpeed*-1; }
    player.x += dx; player.z += dz;
    player.x = clamp(player.x, -58, 58); player.z = clamp(player.z, -58, 58);
  }
  camera.position.set(player.x, player.y, player.z);
  camera.rotation.set(player.pitch, player.yaw, 0);

  // Monster AI: only visible sometimes, flickers, stalks, teleports
  if (!gameOver && !hallucinating) {
    let px = player.x, pz = player.z;
    let mx = monster.position.x, mz = monster.position.z;
    let dist = dist2d(mx, mz, px, pz);

    // Flicker visibility: only see monster in 2/7 frames, and only within 34 units
    let canSee = dist < 34 && Math.floor(Math.random()*7)<2;
    monster.visible = canSee;

    // Monster movement: either stalk, lurk, or teleport
    if (dist < 32) {
      // If player is looking at monster, don't move; else, stalk
      let lookVec = new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
      let toMonster = new THREE.Vector3(mx-px,0,mz-pz).normalize();
      let facing = lookVec.dot(toMonster);
      if (facing < 0.7 || Math.random()<0.05) {
        // Not looking or random move: stalk, but sometimes jump
        if (Math.random() < 0.02 && dist > 8 && !monsterSFX.isPlaying) {
          // Teleport closer, play sound
          let angle = Math.random()*2*Math.PI;
          let radius = Math.random()*10+8;
          monster.position.x = px + Math.cos(angle)*radius;
          monster.position.z = pz + Math.sin(angle)*radius;
          monsterSFX.currentTime = 0; monsterSFX.play();
        } else {
          let speed = dist<7 ? 0.12 : 0.052;
          monster.position.x += (px - mx)*speed/dist;
          monster.position.z += (pz - mz)*speed/dist;
        }
      }
      // Monster jumpscare
      if (dist < 1.7 && !gameOver) {
        endGame("The horror found you.");
        staticSFX.volume = 0.4; monsterSFX.currentTime=0; monsterSFX.play();
        monster.material.emissiveIntensity = 5;
        setTimeout(()=>{staticSFX.volume=0.14},2000);
      }
      // Play random monster sound
      if (Date.now() - lastMonsterSound > 5000 + Math.random()*7000) {
        lastMonsterSound = Date.now();
        whisperSFX.currentTime = 0; whisperSFX.play();
      }
    }
  }

  // Hallucinations: rare visual/sonic
  if (!gameOver && !hallucinating && Date.now()-lastHallucination>10000 && Math.random()<0.008) {
    hallucinate("The world warps...");
  }

  // Heartbeat and breath: speed up near monster
  if (!gameOver) {
    let dist = dist2d(monster.position.x, monster.position.z, player.x, player.z);
    heartSFX.playbackRate = clamp(2-(dist/38), 1, 2.3);
    breathSFX.playbackRate = clamp(2-(dist/34), 1, 1.35);
  }

  composer.render();
}

function hallucinate(msg) {
  hallucinating = true; hudMsg.innerText = msg||"";
  document.body.style.filter = "contrast(1.7) blur(1.5px) hue-rotate(-20deg)";
  staticSFX.volume = 0.35; whisperSFX.currentTime=0; whisperSFX.play();
  setTimeout(()=>{
    document.body.style.filter = ""; hudMsg.innerText = "";
    staticSFX.volume = 0.14; hallucinating = false;
    lastHallucination = Date.now();
  }, 1900+Math.random()*1700);
}

function endGame(msg) {
  gameOver = true; hudMsg.innerText = msg; staticSFX.pause();
  heartSFX.pause(); breathSFX.pause();
  setTimeout(()=>window.location.reload(), 7000);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
