// Hex board math. Board is COLS x ROWS in "odd-r" offset coordinates.
// Rows 0..3 belong to the enemy, rows 4..7 to the player (row 4 = front).

export const COLS = 7;
export const ROWS = 8;
export const HEX_R = 1;
export const HEX_W = Math.sqrt(3) * HEX_R;
export const HEX_H = 1.5 * HEX_R;
export const PLAYER_ROWS = [4, 5, 6, 7];
export const ENEMY_ROWS = [0, 1, 2, 3];

export function hexToWorld(c, r) {
  const x = (c + (r & 1) * 0.5 - (COLS - 1) / 2 - 0.25) * HEX_W;
  const z = (r - (ROWS - 1) / 2) * HEX_H;
  return { x, z };
}

export function toCube(c, r) {
  const x = c - (r - (r & 1)) / 2;
  const z = r;
  return { x, y: -x - z, z };
}

export function hexDist(a, b) {
  const A = toCube(a.c, a.r);
  const B = toCube(b.c, b.r);
  return Math.max(Math.abs(A.x - B.x), Math.abs(A.y - B.y), Math.abs(A.z - B.z));
}

const ODD_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
const EVEN_DIRS = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];

export function neighbors(c, r) {
  const dirs = (r & 1) ? ODD_DIRS : EVEN_DIRS;
  const out = [];
  for (const [dc, dr] of dirs) {
    const nc = c + dc;
    const nr = r + dr;
    if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) out.push({ c: nc, r: nr });
  }
  return out;
}

export function inBounds(c, r) {
  return c >= 0 && c < COLS && r >= 0 && r < ROWS;
}

export function key(c, r) {
  return `${c},${r}`;
}

export function allHexes() {
  const out = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) out.push({ c, r });
  return out;
}

// Mirror a player-side position to the enemy side (used for enemy layouts).
export function mirror(pos) {
  return { c: COLS - 1 - pos.c, r: ROWS - 1 - pos.r };
}
