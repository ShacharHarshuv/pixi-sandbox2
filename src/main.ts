import { Application, Assets, PerspectiveMesh } from 'pixi.js';

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

// Helper function to set UV coordinates for the entire mesh
// u0, v0 = top-left UV (0-1), u1, v1 = bottom-right UV (0-1)
const setUVRect = (u0: number, v0: number, u1: number, v1: number) => {
  const uvData = uvBuffer.data;
  const verticesX = mesh.geometry.verticesX;
  const verticesY = mesh.geometry.verticesY;

  for (let y = 0; y <= verticesY; y++) {
    for (let x = 0; x <= verticesX; x++) {
      const u = u0 + (u1 - u0) * (x / verticesX);
      const v = v0 + (v1 - v0) * (y / verticesY);
      const index = (y * (verticesX + 1) + x) * 2;
      uvData[index] = u;
      uvData[index + 1] = v;
    }
  }
  uvBuffer.update();
};

// Zoom the texture (values > 1 make it appear bigger/zoomed in)
// sx, sy control horizontal and vertical zoom
// Scales existing UVs around center point to preserve perspective
const zoomUV = (sx: number, sy: number) => {
  const uvData = uvBuffer.data;
  const cx = 0.5;
  const cy = 0.5;

  for (let i = 0; i < uvData.length; i += 2) {
    const u = uvData[i];
    const v = uvData[i + 1];
    uvData[i] = cx + (u - cx) / sx;
    uvData[i + 1] = cy + (v - cy) / sy;
  }
  uvBuffer.update();
};

// Pan/offset the texture in UV space
const panUV = (du: number, dv: number) => {
  const uvData = uvBuffer.data;
  for (let i = 0; i < uvData.length; i += 2) {
    uvData[i] += du;
    uvData[i + 1] += dv;
  }
  uvBuffer.update();
};

function scale(value: number) {
  zoomUV(value, value);
}

function panRight() {
  panUV(-0.05, 0);
}

function panLeft() {
  panUV(0.05, 0);
}

function panUp() {
  panUV(0, 0.05);
}

function panDown() {
  panUV(0, -0.05);
}

(window as any).scale = scale;
(window as any).panRight = panRight;
(window as any).panLeft = panLeft;
(window as any).panUp = panUp;
(window as any).panDown = panDown;
