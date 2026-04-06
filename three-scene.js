// ═══════════════════════════════════════════
//   three-scene.js
//   Three.js 3D scene — GLB model loader
//   Holo Mat — Stark Industries
// ═══════════════════════════════════════════

const THREEScene = (() => {

  // ── Core objects ──
  let renderer, scene, camera, controls;
  let loadedModel   = null;
  let animationId   = null;
  let autoRotate    = true;
  let isWireframe   = false;
  let isHoloTint    = false;
  let originalMats  = [];
  let modelLoaded   = false;

  // ── Hologram tint color ──
  const HOLO_COLOR = 0x00d4ff;

  // ─────────────────────────────────────────
  // INIT — set up the Three.js scene
  // ─────────────────────────────────────────
  function init() {
    const canvas = document.getElementById('threeCanvas');
    const zone   = document.getElementById('projectionZone');
    const W = zone.clientWidth  || 480;
    const H = zone.clientHeight || 480;

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // transparent bg
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000);
    camera.position.set(0, 0, 3);

    // Lights
    const ambient = new THREE.AmbientLight(0x00d4ff, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x0066ff, 0.8);
    rimLight.position.set(-5, -5, -5);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(0x00ff88, 0.5, 10);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    // OrbitControls — mouse drag + scroll
    controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.08;
    controls.enablePan      = false;
    controls.minDistance    = 0.5;
    controls.maxDistance    = 20;
    controls.autoRotate     = true;
    controls.autoRotateSpeed = 1.5;

    // Hide canvas until model loaded
    canvas.style.display = 'none';

    // Start render loop
    animate();

    // Resize handler
    window.addEventListener('resize', onResize);
  }

  // ─────────────────────────────────────────
  // RENDER LOOP
  // ─────────────────────────────────────────
  function animate() {
    animationId = requestAnimationFrame(animate);
    controls && controls.update();
    renderer && renderer.render(scene, camera);
  }

  // ─────────────────────────────────────────
  // RESIZE
  // ─────────────────────────────────────────
  function onResize() {
    const zone = document.getElementById('projectionZone');
    if (!zone || !renderer) return;
    const W = zone.clientWidth;
    const H = zone.clientHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }

  // ─────────────────────────────────────────
  // LOAD GLB MODEL
  // ─────────────────────────────────────────
  function loadModel(file) {
    const url    = URL.createObjectURL(file);
    const loader = new THREE.GLTFLoader();
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);

    // Update UI
    document.getElementById('modelStatus').textContent  = 'LOADING...';
    document.getElementById('modelInfo').style.display  = 'flex';
    document.getElementById('modelName').textContent    = file.name;
    document.getElementById('modelSize').textContent    = sizeMB + ' MB';
    document.getElementById('holoName').textContent     = file.name.replace('.glb','').toUpperCase();
    document.getElementById('holoStatus').textContent   = 'LOADING MODEL...';

    // Remove old model
    if (loadedModel) {
      scene.remove(loadedModel);
      loadedModel = null;
      originalMats = [];
      modelLoaded  = false;
    }

    loader.load(
      url,
      // ── SUCCESS ──
      (gltf) => {
        loadedModel = gltf.scene;

        // Center and scale the model to fit the view
        const box    = new THREE.Box3().setFromObject(loadedModel);
        const size   = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 2.0 / maxDim;

        loadedModel.scale.setScalar(scale);
        loadedModel.position.sub(center.multiplyScalar(scale));

        // Store original materials for switching
        originalMats = [];
        loadedModel.traverse(child => {
          if (child.isMesh && child.material) {
            originalMats.push({
              mesh: child,
              mat:  Array.isArray(child.material)
                      ? child.material.map(m => m.clone())
                      : child.material.clone()
            });
          }
        });

        scene.add(loadedModel);
        modelLoaded = true;

        // Show canvas, hide orb
        document.getElementById('threeCanvas').style.display = 'block';
        document.getElementById('jarvisOrb').style.display   = 'none';

        // Update UI
        document.getElementById('modelStatus').textContent = 'MODEL LOADED ✓';
        document.getElementById('holoStatus').textContent  = 'DRAG TO ROTATE • SCROLL TO ZOOM';

        // Fit camera
        camera.position.set(0, 0, maxDim * scale * 2.5);
        controls.reset();

        URL.revokeObjectURL(url);

        if (window.updateLastCmd) updateLastCmd('MODEL LOADED: ' + file.name.toUpperCase());
        if (window.speak) speak('Model loaded successfully, sir. Rendering holographic projection now.');
      },
      // ── PROGRESS ──
      (xhr) => {
        const pct = Math.round(xhr.loaded / xhr.total * 100);
        document.getElementById('modelStatus').textContent = 'LOADING ' + pct + '%...';
      },
      // ── ERROR ──
      (err) => {
        console.error('GLB Load Error:', err);
        document.getElementById('modelStatus').textContent = 'LOAD FAILED ✗';
        document.getElementById('holoStatus').textContent  = 'ERROR — TRY ANOTHER FILE';
        if (window.speak) speak('Model failed to load, sir. Please try another file.');
      }
    );
  }

  // ─────────────────────────────────────────
  // MODEL CONTROLS
  // ─────────────────────────────────────────
  function control(action) {
    if (!modelLoaded && action !== 'reset') return;

    switch (action) {

      case 'wireframe':
        isWireframe = true;
        isHoloTint  = false;
        loadedModel.traverse(child => {
          if (child.isMesh) {
            const m = new THREE.MeshBasicMaterial({
              color: HOLO_COLOR, wireframe: true
            });
            child.material = m;
          }
        });
        break;

      case 'solid':
        isWireframe = false;
        isHoloTint  = false;
        restoreOriginalMaterials();
        break;

      case 'holo':
        isHoloTint  = true;
        isWireframe = false;
        loadedModel.traverse(child => {
          if (child.isMesh) {
            child.material = new THREE.MeshPhongMaterial({
              color:       HOLO_COLOR,
              emissive:    new THREE.Color(0x003344),
              transparent: true,
              opacity:     0.75,
              wireframe:   false,
            });
          }
        });
        break;

      case 'autorot':
        autoRotate = !autoRotate;
        controls.autoRotate = autoRotate;
        break;

      case 'reset':
        camera.position.set(0, 0, 3);
        controls.reset();
        if (loadedModel) {
          loadedModel.rotation.set(0, 0, 0);
          loadedModel.position.set(0, 0, 0);
        }
        break;

      case 'zoom_in':
        camera.position.multiplyScalar(0.85);
        break;

      case 'zoom_out':
        camera.position.multiplyScalar(1.15);
        break;

      case 'explode':
        if (!loadedModel) break;
        let i = 0;
        loadedModel.traverse(child => {
          if (child.isMesh) {
            const dir = new THREE.Vector3(
              Math.sin(i * 1.2), Math.cos(i * 0.8), Math.sin(i * 0.5)
            ).normalize().multiplyScalar(0.4);
            child.position.add(dir);
            i++;
          }
        });
        break;
    }
  }

  function restoreOriginalMaterials() {
    originalMats.forEach(({ mesh, mat }) => {
      mesh.material = mat;
    });
  }

  function gestureRotateByDelta(deltaX) {
    if (!loadedModel || !modelLoaded || typeof deltaX !== 'number') return;
    loadedModel.rotation.y += deltaX * 8;
  }

  function gestureZoomByDelta(deltaPinch) {
    if (!camera || typeof deltaPinch !== 'number') return;
    const scale = 1 - deltaPinch * 2.2;
    const clamped = Math.max(0.94, Math.min(1.06, scale));
    camera.position.multiplyScalar(clamped);
    camera.position.z = Math.max(0.5, Math.min(20, camera.position.z));
  }

  // ─────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────
  return { init, loadModel, control, gestureRotateByDelta, gestureZoomByDelta };

})();

// ── Called from HTML file input ──
function loadGLBModel(input) {
  const file = input.files[0];
  if (!file) return;
  THREEScene.loadModel(file);
}

// ── Called from buttons ──
function modelControl(action) {
  THREEScene.control(action);
}

window.THREESceneGestureControl = {
  rotateByDelta(deltaX) {
    THREEScene.gestureRotateByDelta(deltaX);
  },
  zoomByDelta(deltaPinch) {
    THREEScene.gestureZoomByDelta(deltaPinch);
  },
};

// ── Init on page load ──
window.addEventListener('load', () => {
  THREEScene.init();
});
