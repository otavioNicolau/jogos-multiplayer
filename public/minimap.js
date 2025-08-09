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
    this.dpr = 1;
  }

  resize(dpr = window.devicePixelRatio || 1) {
    this.dpr = dpr;
    const size = 220;
    this.canvas.width = Math.floor(size * dpr);
    this.canvas.height = Math.floor(size * dpr);
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  render(world, players, apples, drops, myId) {
    const mtx = this.ctx;
    if (!mtx) return;
    const mW = this.canvas.width / this.dpr,
      mH = this.canvas.height / this.dpr;
    mtx.clearRect(0, 0, mW, mH);

    // Avoid zooming in when the world is smaller than the minimap by
    // clamping the scale to 1. This keeps objects visually smaller.
    const sx = Math.min(mW / world.w, 1),
      sy = Math.min(mH / world.h, 1);

    // Center the world inside the minimap when there is extra space.
    const ox = (mW - world.w * sx) / 2,
      oy = (mH - world.h * sy) / 2;

    mtx.globalAlpha = 0.18;
    mtx.fillStyle = '#7f8cff';
    for (let y = 0; y < world.h; y += 4) {
      for (let x = 0; x < world.w; x += 4) {
        if (hash32(x, y) > 0.75)
          mtx.fillRect(
            Math.floor(x * sx + ox),
            Math.floor(y * sy + oy),
            Math.max(1, Math.ceil(2 * sx)),
            Math.max(1, Math.ceil(2 * sy))
          );
      }
    }
    mtx.globalAlpha = 1;

    mtx.fillStyle = '#ffcc00';
    apples.forEach((a) =>
      mtx.fillRect(
        a.x * sx + ox,
        a.y * sy + oy,
        Math.max(1, sx),
        Math.max(1, sy)
      )
    );
    mtx.fillStyle = '#ff9f1a';
    drops.forEach((d) =>
      mtx.fillRect(
        d.x * sx + ox,
        d.y * sy + oy,
        Math.max(1, sx),
        Math.max(1, sy)
      )
    );
    Object.entries(players).forEach(([id, p]) => {
      mtx.fillStyle = id === myId ? '#ffffff' : '#7c5cff';
      mtx.fillRect(
        p.x * sx + ox,
        p.y * sy + oy,
        Math.max(1, sx),
        Math.max(1, sy)
      );
    });
  }
}

window.MiniMap = MiniMap;
