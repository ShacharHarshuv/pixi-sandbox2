import { Application, Assets, Graphics, PerspectiveMesh } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import { Point, Quad, rectSpaceFromImageQuad } from './algebra';

(async () => {
  const app = new Application();
  console.log('app', app);

  await app.init({
    width: 800,
    height: 600,
    backgroundColor: 0x1099bb,
  });

  document.body.appendChild(app.canvas);

  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;

  const texture = await Assets.load('/assets/image.jpeg');

  const quad: Quad = [
    { x: 200, y: 150 },
    { x: 500, y: 130 },
    { x: 520, y: 340 },
    { x: 190, y: 300 },
  ];

  const mesh = new PerspectiveMesh({
    texture,
    verticesX: 10,
    verticesY: 10,
  });

  const quadMask = new Graphics();
  quadMask.poly(quad, true).fill({ color: 0xff0000 });
  mesh.mask = quadMask;

  const imageOutline = new Graphics();

  app.stage.addChild(mesh);
  app.stage.addChild(imageOutline);

  function updateCorners() {
    imageOutline
      .clear()
      .poly(quad, true)
      .stroke({ color: 0x00ff00, width: 2, alignment: 0 })
      .fill({ color: 0x000000, alpha: 0 });

    mesh.setCorners(
      // top-left
      quad[0].x,
      quad[0].y,
      // top-right
      quad[1].x,
      quad[1].y,
      // bottom-right
      quad[2].x,
      quad[2].y,
      // bottom-left
      quad[3].x,
      quad[3].y
    );
  }

  updateCorners();

  // Your quad points in image pixels (must correspond to rectangle corners):
  // p0 -> top-left, p1 -> top-right, p2 -> bottom-right, p3 -> bottom-left (for example)

  let space = rectSpaceFromImageQuad(quad);

  function moveInUv(xy: Point, du: number, dv: number) {
    const uv = space.toRect(xy);
    const uvMoved = { x: uv.x + du, y: uv.y + dv };
    const xyMoved = space.toImage(uvMoved);
    return xyMoved;
  }

  function moveEntireQuad(du: number, dv: number) {
    quad[0] = moveInUv(quad[0], du, dv);
    quad[1] = moveInUv(quad[1], du, dv);
    quad[2] = moveInUv(quad[2], du, dv);
    quad[3] = moveInUv(quad[3], du, dv);
    space = rectSpaceFromImageQuad(quad);
    updateCorners();
  }

  function panRight() {
    moveEntireQuad(0.1, 0);
  }

  function panUp() {
    moveEntireQuad(0, -0.1);
  }

  function panDown() {
    moveEntireQuad(0, 0.1);
  }

  function panLeft() {
    moveEntireQuad(-0.1, 0);
  }

  function scale(d: number) {
    quad[1] = moveInUv(quad[1], d, 0);
    quad[2] = moveInUv(quad[2], d, d);
    quad[3] = moveInUv(quad[3], 0, d);
    updateCorners();
  }

  (window as any).panRight = panRight;
  (window as any).panUp = panUp;
  (window as any).panDown = panDown;
  (window as any).panLeft = panLeft;
  (window as any).scale = scale;

  function setupUvDrag(
    target: Graphics,
    onDrag: (du: number, dv: number) => void
  ) {
    let isDragging = false;
    let dragStartUv: Point | null = null;
    let pointerId: number | null = null;

    target.eventMode = 'static';
    target.cursor = 'grab';

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      dragStartUv = null;
      pointerId = null;
      target.cursor = 'grab';

      app.stage.off('globalpointermove', onMove);
      app.stage.off('pointerup', endDrag);
      app.stage.off('pointerupoutside', endDrag);
      app.stage.off('pointercancel', endDrag);
    };

    const onMove = (e: FederatedPointerEvent) => {
      if (!isDragging || !dragStartUv) return;
      if (pointerId !== null && e.pointerId !== pointerId) return;

      const currentPos = e.global;
      const currentUv = space.toRect(currentPos);
      const du = currentUv.x - dragStartUv.x;
      const dv = currentUv.y - dragStartUv.y;
      onDrag(du, dv);
      dragStartUv = space.toRect(currentPos);
    };

    target.on('pointerdown', (e: FederatedPointerEvent) => {
      if (isDragging) return;

      isDragging = true;
      pointerId = e.pointerId;
      dragStartUv = space.toRect(e.global);
      target.cursor = 'grabbing';

      app.canvas.setPointerCapture?.(e.pointerId);

      app.stage.on('globalpointermove', onMove);
      app.stage.on('pointerup', endDrag);
      app.stage.on('pointerupoutside', endDrag);
      app.stage.on('pointercancel', endDrag);
    });
  }

  setupUvDrag(imageOutline, moveEntireQuad);
})();
