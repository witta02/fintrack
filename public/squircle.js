registerPaint('smooth-corners', class {
  static get inputProperties() {
    return ['--smooth-corners'];
  }

  paint(ctx, size, styleMap) {
    const n = parseFloat(styleMap.get('--smooth-corners')?.toString()) || 4; // 4 is standard squircle
    const w = size.width / 2;
    const h = size.height / 2;

    ctx.fillStyle = 'black'; // Color is arbitrary when used as a mask
    ctx.beginPath();
    
    // Draw superellipse: |x/a|^n + |y/b|^n = 1
    // parametric equations:
    // x = |cos(t)|^(2/n) * a * sign(cos(t)) + a
    // y = |sin(t)|^(2/n) * b * sign(sin(t)) + b
    for (let i = 0; i < 2 * Math.PI; i += 0.01) {
      const x = Math.pow(Math.abs(Math.cos(i)), 2 / n) * w * Math.sign(Math.cos(i)) + w;
      const y = Math.pow(Math.abs(Math.sin(i)), 2 / n) * h * Math.sign(Math.sin(i)) + h;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }
});
