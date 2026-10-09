// Draws the shareable IPU graphic (1080 x 1350) onto a canvas.
// d: { dateLabel, slotLabel, rows: [{stesen, ipu, status}], fonts: {sans, serif} }
window.ipuPoster = function (canvas, d) {
  const W = 1080;
  const H = 1350;
  const PAD = 72;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const sans = (d.fonts && d.fonts.sans) || 'sans-serif';
  const serif = (d.fonts && d.fonts.serif) || 'serif';

  const INK = '#1F1E1B';
  const MUTED = '#6A665E';
  const BG = '#F6F3EC';
  const PANEL = '#FFFFFF';
  const LINE = '#DFDACE';
  const TRACK = '#ECE8DE';
  const BANDS = [
    { max: 50, label: 'Baik', range: '0–50', c: '#3B82C4' },
    { max: 100, label: 'Sederhana', range: '51–100', c: '#2E9E63' },
    { max: 200, label: 'Tidak Sihat', range: '101–200', c: '#E5B80B' },
    { max: 300, label: 'Sangat Tidak Sihat', range: '201–300', c: '#E0641E' },
    { max: Infinity, label: 'Berbahaya', range: 'lebih 300', c: '#BE2540' },
  ];
  const bandOf = (v) => BANDS.find((b) => v <= b.max);
  const font = (weight, size, family) => weight + ' ' + size + 'px ' + family;
  const spacing = (v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = v; };

  // set a font that fits maxWidth, shrinking from `size` down to `min`
  const fit = (text, maxWidth, weight, size, family, min) => {
    let s = size;
    ctx.font = font(weight, s, family);
    while (s > (min || 14) && ctx.measureText(text).width > maxWidth) {
      s -= 1;
      ctx.font = font(weight, s, family);
    }
    return s;
  };
  const rrect = (x, y, w, h, r) => {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  const rows = d.rows.slice().sort((a, b) => b.ipu - a.ipu);
  const top = rows[0];
  const low = rows[rows.length - 1];
  const over = rows.filter((r) => r.ipu > 100).length;

  // background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // header
  spacing('3px');
  ctx.fillStyle = MUTED;
  ctx.font = font(600, 26, sans);
  ctx.fillText('INDEKS PENCEMARAN UDARA (IPU)', PAD, 104);
  spacing('0px');
  ctx.fillStyle = INK;
  ctx.font = font(400, 108, serif);
  ctx.fillText('Selangor', PAD, 214);
  fit(d.dateLabel + '  ·  ' + d.slotLabel, W - PAD * 2, 500, 40, sans, 26);
  ctx.fillText(d.dateLabel + '  ·  ' + d.slotLabel, PAD, 282);

  // summary banner, tinted by the worst reading's category
  const worst = bandOf(top.ipu);
  const bY = 322;
  const bH = 132;
  rrect(PAD, bY, W - PAD * 2, bH, 18);
  ctx.fillStyle = PANEL;
  ctx.fill();
  ctx.save();
  rrect(PAD, bY, W - PAD * 2, bH, 18);
  ctx.clip();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = worst.c;
  ctx.fillRect(PAD, bY, W - PAD * 2, bH);
  ctx.globalAlpha = 1;
  ctx.fillRect(PAD, bY, 14, bH);
  ctx.restore();
  const line1 = over === 0
    ? 'Tiada stesen melepasi IPU 100'
    : over + ' daripada ' + rows.length + ' stesen melepasi IPU 100';
  const line2 = rows.length > 1
    ? 'Tertinggi ' + top.ipu + ' di ' + top.stesen + '  ·  terendah ' + low.ipu + ' di ' + low.stesen
    : top.stesen + ': ' + top.ipu + ' (' + top.status + ')';
  ctx.fillStyle = INK;
  fit(line1, W - PAD * 2 - 80, 600, 40, sans, 26);
  ctx.fillText(line1, PAD + 44, bY + 58);
  fit(line2, W - PAD * 2 - 80, 400, 28, sans, 20);
  ctx.fillText(line2, PAD + 44, bY + 102);

  // station rows
  const areaTop = 492;
  const areaBottom = 1118;
  const rowH = Math.min(118, (areaBottom - areaTop) / rows.length);
  const nameW = 300;
  const trackX = PAD + nameW + 24;
  const numW = 150;
  const trackW = W - PAD - numW - trackX;
  const maxVal = top.ipu;
  const scaleTop = maxVal <= 300 ? 300 : Math.ceil(maxVal / 100) * 100;
  const xOf = (v) => trackX + (v / scaleTop) * trackW;
  const ticks = [100, 200, 300].concat(scaleTop > 300 ? [scaleTop] : []);
  const rowsBottom = areaTop + rowH * rows.length;

  rows.forEach((r, i) => {
    const y = areaTop + i * rowH;
    const mid = y + rowH / 2;
    const b = bandOf(r.ipu);
    if (i > 0) {
      ctx.fillStyle = LINE;
      ctx.fillRect(PAD, y, W - PAD * 2, 1);
    }
    // name and status
    ctx.fillStyle = INK;
    fit(r.stesen, nameW, 600, 36, sans, 24);
    ctx.fillText(r.stesen, PAD, mid - 4);
    rrect(PAD, mid + 14, 20, 20, 5);
    ctx.fillStyle = b.c;
    ctx.fill();
    ctx.fillStyle = MUTED;
    fit(r.status, nameW - 32, 500, 24, sans, 18);
    ctx.fillText(r.status, PAD + 32, mid + 32);
    // track and bar
    const th = 30;
    rrect(trackX, mid - th / 2, trackW, th, 8);
    ctx.fillStyle = TRACK;
    ctx.fill();
    const bw = Math.max(10, xOf(r.ipu) - trackX);
    rrect(trackX, mid - th / 2, bw, th, 8);
    ctx.fillStyle = b.c;
    ctx.fill();
    // value
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.font = font(600, 68, sans);
    ctx.fillText(String(r.ipu), W - PAD, mid + 24);
    ctx.textAlign = 'left';
  });

  // category boundaries across the rows, with their values underneath
  ctx.save();
  ctx.strokeStyle = 'rgba(31, 30, 27, 0.28)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 8]);
  ticks.forEach((t) => {
    if (t >= scaleTop) return;
    ctx.beginPath();
    ctx.moveTo(xOf(t), areaTop + 6);
    ctx.lineTo(xOf(t), rowsBottom - 6);
    ctx.stroke();
  });
  ctx.restore();
  ctx.fillStyle = MUTED;
  ctx.font = font(500, 22, sans);
  ctx.textAlign = 'center';
  [0].concat(ticks).forEach((t) => {
    ctx.textAlign = t === 0 ? 'left' : t >= scaleTop ? 'right' : 'center';
    ctx.fillText(String(t), xOf(t), rowsBottom + 30);
  });
  ctx.textAlign = 'left';

  // legend
  const legY = Math.max(rowsBottom + 86, 1196);
  let labelSize = 23;
  const measure = (size) => {
    const widths = BANDS.map((b) => {
      ctx.font = font(600, size, sans);
      const a = ctx.measureText(b.label).width;
      ctx.font = font(400, size - 3, sans);
      const c = ctx.measureText(b.range).width;
      return 30 + Math.max(a, c);
    });
    return widths;
  };
  let widths = measure(labelSize);
  const avail = W - PAD * 2;
  while (labelSize > 15 && widths.reduce((s, w) => s + w, 0) + 4 * 20 > avail) {
    labelSize -= 1;
    widths = measure(labelSize);
  }
  const gap = (avail - widths.reduce((s, w) => s + w, 0)) / 4;
  let lx = PAD;
  BANDS.forEach((b, i) => {
    rrect(lx, legY - 18, 20, 20, 5);
    ctx.fillStyle = b.c;
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = font(600, labelSize, sans);
    ctx.fillText(b.label, lx + 30, legY);
    ctx.fillStyle = MUTED;
    ctx.font = font(400, labelSize - 3, sans);
    ctx.fillText(b.range, lx + 30, legY + labelSize + 6);
    lx += widths[i] + gap;
  });

  // footer
  ctx.fillStyle = LINE;
  ctx.fillRect(PAD, H - 92, W - PAD * 2, 1);
  ctx.fillStyle = MUTED;
  ctx.font = font(400, 22, sans);
  ctx.fillText('Sumber: APIMS, Jabatan Alam Sekitar Malaysia', PAD, H - 52);
  ctx.textAlign = 'right';
  ctx.fillText('eqms.doe.gov.my/APIMS/main', W - PAD, H - 52);
  ctx.textAlign = 'left';
};
