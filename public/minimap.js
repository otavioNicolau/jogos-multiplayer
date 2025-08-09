function hash32(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h ^= h << 13;
  h ^= h >>> 17;
  h ^= h << 5;
  return (h >>> 0) / 4294967296;
}

class MiniMap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render(world, players, apples, drops, myId) {
    const mtx = this.ctx;
    if (!mtx) return;
    const mW = this.canvas.width,
      mH = this.canvas.height;
    mtx.clearRect(0, 0, mW, mH);
    const sx = mW / world.w,
      sy = mH / world.h;

    mtx.globalAlpha = 0.18;
    mtx.fillStyle = '#7f8cff';
    for (let y = 0; y < world.h; y += 4) {
      for (let x = 0; x < world.w; x += 4) {
        if (hash32(x, y) > 0.75)
          mtx.fillRect(
            Math.floor(x * sx),
            Math.floor(y * sy),
            Math.ceil(2 * sx),
            Math.ceil(2 * sy)
          );
      }
    }
    mtx.globalAlpha = 1;

    mtx.fillStyle = '#ffcc00';
    apples.forEach((a) =>
      mtx.fillRect(a.x * sx, a.y * sy, Math.max(1, sx), Math.max(1, sy))
    );
    mtx.fillStyle = '#ff9f1a';
    drops.forEach((d) =>
      mtx.fillRect(d.x * sx, d.y * sy, Math.max(1, sx), Math.max(1, sy))
    );
    Object.entries(players).forEach(([id, p]) => {
      mtx.fillStyle = id === myId ? '#ffffff' : '#7c5cff';
      mtx.fillRect(
        p.x * sx,
        p.y * sy,
        Math.max(1, sx + 0.5),
        Math.max(1, sy + 0.5)
      );
    });
  }
}

window.MiniMap = MiniMap;
