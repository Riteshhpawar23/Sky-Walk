// --- SUN LOADING LOGIC ---
let sunModel = null;
let cameraAnimating = false;
let bloomPass = null;
function showSun() {
  // Hide button and SPACEWALK text
  const btn = document.getElementById('dive-btn');
  const afterBang = document.getElementById('spacewalk-afterbang');
  if (btn) btn.style.display = 'none';
  if (afterBang) afterBang.style.display = 'none';
  // Show or load sun
  function focusCameraOnSun() {
    // Start camera far away and animate to sun
    cameraAnimating = true;
    let start = { x: 0, y: 0, z: 600 };
  let end = { x: 0, y: 0, z: 270 };
    // Instantly move camera to start if not already there
    camera.position.set(start.x, start.y, start.z);
    if (controls) controls.target.set(0,0,0);
    camera.lookAt(0,0,0);
    let duration = 1800; // ms
    let startTime = performance.now();
    function animateCamera(now) {
      let t = Math.min((now - startTime) / duration, 1);
      // Ease in-out
      t = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      camera.position.x = start.x + (end.x - start.x) * t;
      camera.position.y = start.y + (end.y - start.y) * t;
      camera.position.z = start.z + (end.z - start.z) * t;
      camera.lookAt(0,0,0);
      if (controls) controls.target.set(0,0,0);
      if (t < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        cameraAnimating = false;
        // Make the sun glow a little more when camera stops
        if (bloomPass) {
          bloomPass.strength = 1.5;
          bloomPass.radius = 0.18;
          bloomPass.threshold = 0.3;
        }
      }
    }
    requestAnimationFrame(animateCamera);
  }
  function reduceSunGlow() {
    if (bloomPass) {
      bloomPass.strength = 0.9;
      bloomPass.radius = 0.1;
      bloomPass.threshold = 0.5;
    }
  }
  if (sunModel) {
    sunModel.visible = true;
    focusCameraOnSun();
    reduceSunGlow();
    return;
  }
  const loader = new THREE.GLTFLoader();
  loader.load('sun/scene.gltf', function(gltf) {
    sunModel = gltf.scene;
    sunModel.position.set(0, 0, 0);
    sunModel.scale.set(10, 10, 10); // Adjust scale as needed
    scene.add(sunModel);
    focusCameraOnSun();
    reduceSunGlow();
  }, undefined, function(error) {
    console.error('Error loading sun model:', error);
  });
}

// Add event listener for the button after DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('dive-btn');
  if (btn) {
    btn.addEventListener('click', showSun);
  }
});
// --------------------------------------------------------------------------------
// Global variables for scene, camera, renderer, controls, and simulation objects.
// --------------------------------------------------------------------------------
let scene, camera, renderer, controls, composer;
let particleSystem, particlePositions, particleVelocities;
let galaxySystem = null; // Will hold the galaxy cluster (added later)
let particleCount = 20000; // Number of particles for the Big Bang explosion
let params; // Object to store simulation parameters
let clock = new THREE.Clock(); // Clock to keep track of elapsed time

// Initialize the scene and start the animation loop.

init();
animate();

// --------------------------------------------------------------------------------
// Function: init()
// Sets up the scene, camera, renderer, lights, particle system, post-processing, etc.
// --------------------------------------------------------------------------------
function init() {
  // Define simulation parameters.
  params = {
    expansionSpeed: 50,
    particleSize: 2,
    bloomStrength: 2,
    bloomRadius: 0.5,
    bloomThreshold: 0,
  };

  // Create a new scene.
  scene = new THREE.Scene();

  // Create a perspective camera.
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.set(0, 0, 200);

  // Create the WebGL renderer with antialiasing and set its size.
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true; // Enable shadow maps for added realism.
  document.body.appendChild(renderer.domElement);

  // Add OrbitControls so the user can explore the scene.
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Smooth out camera movement.
  controls.dampingFactor = 0.05;

  // Add ambient light to gently light the scene.
  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);

  // Add a point light at the origin to simulate the intense energy of the Big Bang.
  const pointLight = new THREE.PointLight(0xffffff, 2, 1000);
  pointLight.position.set(0, 0, 0);
  pointLight.castShadow = true;
  scene.add(pointLight);

  // Set up post-processing using EffectComposer and add a bloom pass to simulate volumetric light.
  composer = new THREE.EffectComposer(renderer);
  let renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    params.bloomStrength,
    params.bloomRadius,
    params.bloomThreshold
  );
  composer.addPass(bloomPass);

  // Create the primary particle system representing the initial Big Bang explosion.
  createParticleSystem();

  // Listen for window resize events.
  window.addEventListener("resize", onWindowResize, false);
}

// --------------------------------------------------------------------------------
// Function: createParticleSystem()
// Creates a particle system where all particles originate at the singularity and
// are assigned random velocities that will cause them to expand outward.
// --------------------------------------------------------------------------------
function createParticleSystem() {
  // Create a BufferGeometry to store particle positions.
  const geometry = new THREE.BufferGeometry();

  // Allocate arrays for particle positions and velocities.
  particlePositions = new Float32Array(particleCount * 3);
  particleVelocities = new Float32Array(particleCount * 3);

  // Initialize each particle at (0,0,0) with a random outward velocity.
  for (let i = 0; i < particleCount; i++) {
    // All particles start at the singularity.
    particlePositions[i * 3] = 0;
    particlePositions[i * 3 + 1] = 0;
    particlePositions[i * 3 + 2] = 0;

    // Randomly determine the particle's direction (spherical coordinates).
    let theta = Math.random() * 2 * Math.PI;
    let phi = Math.acos(Math.random() * 2 - 1);
    let speed = Math.random() * 0.5 + 0.5; // Speed between 0.5 and 1.0.
    particleVelocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
    particleVelocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
    particleVelocities[i * 3 + 2] = speed * Math.cos(phi);
  }

  // Attach the positions to the geometry.
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3)
  );

  // Create a PointsMaterial using a custom sprite texture for a soft glow.
  const sprite = generateSprite();
  const material = new THREE.PointsMaterial({
    size: params.particleSize,
    map: sprite,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
    opacity: 0.8,
    color: 0xffffff,
  });

  // Create the particle system and add it to the scene.
  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);
}

// --------------------------------------------------------------------------------
// Function: generateSprite()
// Generates a circular, glowing sprite texture using the canvas element.
// --------------------------------------------------------------------------------
function generateSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");

  // Create a radial gradient for the glow.
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.8)");
  gradient.addColorStop(0.4, "rgba(243, 242, 250, 0.6)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  // Create and return a texture from the canvas.
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// --------------------------------------------------------------------------------
// Function: onWindowResize()
// Adjusts the camera aspect ratio and renderer size when the browser window resizes.
// --------------------------------------------------------------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// --------------------------------------------------------------------------------
// Function: animate()
// The main animation loop: updates particle positions, adds additional cosmic
// elements as time progresses, and renders the scene.
// --------------------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  // Compute the time elapsed since the last frame.
  const delta = clock.getDelta();

  // Update the positions of the explosion particles.
  updateParticles(delta);

  // After 3 seconds, add a galaxy cluster and show SPACEWALK text
  let elapsed = clock.elapsedTime;

  if (elapsed > 6 && !galaxySystem) {
    createGalaxyCluster();
    // Show animated SPACEWALK text in Astronoma font after Big Bang
    const afterBang = document.getElementById('spacewalk-afterbang');
    if (afterBang && !afterBang.hasChildNodes()) {
      const text = 'SPACEWALK';
      const directions = ['from-top','from-bottom','from-left','from-right','from-top','from-bottom','from-left','from-right','from-top','from-bottom'];
      afterBang.innerHTML = '';
      for (let i = 0; i < text.length; i++) {
        const span = document.createElement('span');
        span.textContent = text[i];
        span.className = `letter ${directions[i % directions.length]}`;
        afterBang.appendChild(span);
      }
      // Try to ensure Astronoma font is loaded before showing
      document.fonts && document.fonts.load('1em Astronoma').then(() => {
        afterBang.style.opacity = 1;
        setTimeout(() => {
          const letters = afterBang.querySelectorAll('.letter');
          letters.forEach((letter, idx) => {
            setTimeout(() => {
              letter.style.opacity = 1;
              letter.style.transform = 'translate(0,0)';
            }, idx * 220);
          });
        }, 200);
        // Show button after text animates in
        setTimeout(() => {
          const btn = document.getElementById('dive-btn');
          if (btn) btn.style.display = 'block';
        }, 2400);
      });
    }
  }

  // Update camera controls.
  controls.update();

  // Render the scene using the post-processing composer (which includes bloom).
  composer.render(delta);
}

// --------------------------------------------------------------------------------
// Function: updateParticles()
// Moves each particle outward from the center by updating its position based on
// its velocity and the user-controlled expansion speed.
// --------------------------------------------------------------------------------
function updateParticles(delta) {
  const positions = particleSystem.geometry.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    let index = i * 3;
    positions[index] +=
      particleVelocities[index] * params.expansionSpeed * delta;
    positions[index + 1] +=
      particleVelocities[index + 1] * params.expansionSpeed * delta;
    positions[index + 2] +=
      particleVelocities[index + 2] * params.expansionSpeed * delta;
  }
  particleSystem.geometry.attributes.position.needsUpdate = true;
}

// --------------------------------------------------------------------------------
// Function: createGalaxyCluster()
// Creates a secondary particle system to simulate the appearance of galaxies and
// star clusters in the later universe.
// --------------------------------------------------------------------------------
function createGalaxyCluster() {
  const galaxyCount = 5000; // Number of galaxy particles
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(galaxyCount * 3);

  // Randomly distribute galaxy particles in a large spherical region.
  for (let i = 0; i < galaxyCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1000;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;
  }
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  // Create a PointsMaterial for the galaxy cluster with smaller, fainter points.
  const material = new THREE.PointsMaterial({
    size: 1.5,
    color: 0xaaaaaa,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.5,
    depthTest: false,
  });

  // Create the galaxy particle system and add it to the scene.
  galaxySystem = new THREE.Points(geometry, material);
  scene.add(galaxySystem);
}