import { Application, Assets, PerspectiveMesh } from 'pixi.js';

(async () => {
  const app = new Application();
  console.log('app', app);

  await app.init({
    width: 800,
    height: 600,
    backgroundColor: 0x1099bb,
  });

  document.body.appendChild(app.canvas);

  const texture = await Assets.load('/assets/image.png');
  const mesh = new PerspectiveMesh({
    texture,
    verticesX: 10,
    verticesY: 10,

    // top-left
    x0: 200,
    y0: 150,
    // top-right
    x1: 500,
    y1: 130,
    // bottom-right
    x2: 520,
    y2: 350,
    // bottom-left
    x3: 190,
    y3: 300,
  });

  app.stage.addChild(mesh);

  // Get the UV buffer from the geometry
  const uvBuffer = mesh.geometry.getBuffer('aUV');

  // State tracking for scale and pan
  let currentScaleX = 1;
  let currentScaleY = 1;
  let currentPanX = 0;
  let currentPanY = 0;

  // Store original UV coordinates for recalculation
  const originalUVs = new Float32Array(uvBuffer.data);

  // Apply scale and pan transformations to UV coordinates
  const applyTransform = () => {
    const uvData = uvBuffer.data;
    const cx = 0.5;
    const cy = 0.5;

    for (let i = 0; i < uvData.length; i += 2) {
      const originalU = originalUVs[i];
      const originalV = originalUVs[i + 1];

      // Apply scale around center
      const scaledU = cx + (originalU - cx) / currentScaleX;
      const scaledV = cy + (originalV - cy) / currentScaleY;

      // Apply pan offset
      uvData[i] = scaledU + currentPanX;
      uvData[i + 1] = scaledV + currentPanY;
    }
    uvBuffer.update();

    // Auto-save state
    const state = {
      scaleX: currentScaleX,
      scaleY: currentScaleY,
      panX: currentPanX,
      panY: currentPanY,
    };
    localStorage.setItem('meshTransform', JSON.stringify(state));
  };

  // Initialize original UVs
  for (let i = 0; i < uvBuffer.data.length; i++) {
    originalUVs[i] = uvBuffer.data[i];
  }

  function scale(value: number) {
    currentScaleX *= value;
    currentScaleY *= value;
    applyTransform();
  }

  function panRight() {
    currentPanX -= 0.05;
    applyTransform();
  }

  function panLeft() {
    currentPanX += 0.05;
    applyTransform();
  }

  function panUp() {
    currentPanY += 0.05;
    applyTransform();
  }

  function panDown() {
    currentPanY -= 0.05;
    applyTransform();
  }

  // Load saved state on initialization
  const saved = localStorage.getItem('meshTransform');
  if (saved) {
    const state = JSON.parse(saved);
    currentScaleX = state.scaleX ?? 1;
    currentScaleY = state.scaleY ?? 1;
    currentPanX = state.panX ?? 0;
    currentPanY = state.panY ?? 0;
    applyTransform();
  }

  function downloadCanvas() {
    const backgroundColor = app.renderer.background.color;

    app.renderer.extract.download({
      target: app.stage,
      filename: 'canvas.png',
      frame: app.screen,
      clearColor: backgroundColor,
    });
  }

  (window as any).scale = scale;
  (window as any).panRight = panRight;
  (window as any).panLeft = panLeft;
  (window as any).panUp = panUp;
  (window as any).panDown = panDown;
  (window as any).downloadCanvas = downloadCanvas;
})();
