export type Point = { x: number; y: number };
export type Quad = [Point, Point, Point, Point];

type Vec3 = [number, number, number];
type Mat3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

const eps = 1e-12;

const mulMat3Vec3 = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

const invertMat3 = (m: Mat3): Mat3 => {
  const a = m[0],
    b = m[1],
    c = m[2];
  const d = m[3],
    e = m[4],
    f = m[5];
  const g = m[6],
    h = m[7],
    i = m[8];

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < eps) throw new Error('Matrix not invertible (det ~ 0)');

  const invDet = 1 / det;
  return [
    A * invDet,
    D * invDet,
    G * invDet,
    B * invDet,
    E * invDet,
    H * invDet,
    C * invDet,
    F * invDet,
    I * invDet,
  ];
};

const applyHomography = (H: Mat3, p: Point): Point => {
  const [x, y, w] = mulMat3Vec3(H, [p.x, p.y, 1]);
  if (Math.abs(w) < eps) throw new Error('Point mapped to infinity (w ~ 0)');
  return { x: x / w, y: y / w };
};

// Solves A x = b for square A using Gaussian elimination with partial pivoting.
const solveLinearSystem = (A: number[][], b: number[]): number[] => {
  const n = A.length;
  if (A.some((r) => r.length !== n)) throw new Error('A must be square');
  if (b.length !== n) throw new Error('b must match A size');

  // Augment
  const M = A.map((row, r) => [...row, b[r]]);

  for (let col = 0; col < n; col++) {
    // Pivot
    let pivotRow = col;
    let best = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r][col]);
      if (v > best) {
        best = v;
        pivotRow = r;
      }
    }
    if (best < eps) throw new Error('Singular system (pivot ~ 0)');

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    // Normalize pivot row
    const pivot = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= pivot;

    // Eliminate others
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (Math.abs(factor) < eps) continue;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }

  return M.map((row) => row[n]);
};

/**
 * Compute homography H that maps src[i] -> dst[i] for i=0..3.
 * src/dst must be in corresponding order (clockwise or counterclockwise).
 *
 * Returns H (3x3, row-major) and Hinv.
 */
const homographyFrom4Points = (
  src: [Point, Point, Point, Point],
  dst: [Point, Point, Point, Point]
) => {
  // Fix scale by setting h33 = 1.
  // Unknowns: [h11 h12 h13 h21 h22 h23 h31 h32]
  const A: number[][] = [];
  const b: number[] = [];

  for (let k = 0; k < 4; k++) {
    const { x: u, y: v } = src[k];
    const { x, y } = dst[k];

    // x = (h11*u + h12*v + h13) / (h31*u + h32*v + 1)
    // y = (h21*u + h22*v + h23) / (h31*u + h32*v + 1)

    // Rearranged:
    // h11*u + h12*v + h13 - x*h31*u - x*h32*v = x
    // h21*u + h22*v + h23 - y*h31*u - y*h32*v = y

    A.push([u, v, 1, 0, 0, 0, -x * u, -x * v]);
    b.push(x);

    A.push([0, 0, 0, u, v, 1, -y * u, -y * v]);
    b.push(y);
  }

  const h = solveLinearSystem(A, b);
  const H: Mat3 = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];

  const Hinv = invertMat3(H);
  return { H, Hinv };
};

/**
 * Convenience: set up a "rectangle space" where the quad maps from:
 * (0,0) (W,0) (W,H) (0,H) -> your image quad p0..p3
 *
 * If you don't know aspect ratio, use W=1,H=1.
 */
export const rectSpaceFromImageQuad = (
  imageQuad: [Point, Point, Point, Point],
  rectW = 1,
  rectH = 1
) => {
  const rect: [Point, Point, Point, Point] = [
    { x: 0, y: 0 },
    { x: rectW, y: 0 },
    { x: rectW, y: rectH },
    { x: 0, y: rectH },
  ];

  // rect -> image
  const { H: rectToImg, Hinv: imgToRect } = homographyFrom4Points(
    rect,
    imageQuad
  );

  return {
    rectToImg,
    imgToRect,
    toRect: (pImg: Point) => applyHomography(imgToRect, pImg),
    toImage: (pRect: Point) => applyHomography(rectToImg, pRect),
  };
};
