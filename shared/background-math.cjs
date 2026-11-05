function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function sample(data, width, height, x, y, stride = 1, channel = 0) {
  x = clamp(x, 0, width - 1);
  y = clamp(y, 0, height - 1);
  const x0 = Math.floor(x),
    y0 = Math.floor(y),
    x1 = Math.min(width - 1, x0 + 1),
    y1 = Math.min(height - 1, y0 + 1),
    dx = x - x0,
    dy = y - y0;
  return (
    (data[(y0 * width + x0) * stride + channel] * (1 - dx) +
      data[(y0 * width + x1) * stride + channel] * dx) *
      (1 - dy) +
    (data[(y1 * width + x0) * stride + channel] * (1 - dx) +
      data[(y1 * width + x1) * stride + channel] * dx) *
      dy
  );
}
function prepareInput(image, size = 1024) {
  const { width, height, data } = image;
  if (!width || !height || data.length !== width * height * 4)
    throw new Error("error.bgInference");
  const scale = Math.min(size / width, size / height),
    scaledWidth = Math.max(1, Math.floor(width * scale)),
    scaledHeight = Math.max(1, Math.floor(height * scale)),
    padX = Math.floor((size - scaledWidth) / 2),
    padY = Math.floor((size - scaledHeight) / 2),
    tensor = new Float32Array(3 * size * size);
  for (let y = 0; y < scaledHeight; y++)
    for (let x = 0; x < scaledWidth; x++) {
      const sx = ((x + 0.5) * width) / scaledWidth - 0.5,
        sy = ((y + 0.5) * height) / scaledHeight - 0.5,
        alpha = sample(data, width, height, sx, sy, 4, 3) / 255,
        target = (y + padY) * size + x + padX;
      for (let channel = 0; channel < 3; channel++)
        tensor[channel * size * size + target] =
          (sample(data, width, height, sx, sy, 4, channel) / 255) * alpha +
          (1 - alpha);
    }
  return { tensor, size, scaledWidth, scaledHeight, padX, padY };
}
function applyMask(image, mask, geometry) {
  const { width, height } = image,
    { size, scaledWidth, scaledHeight, padX, padY } = geometry;
  if (mask.length !== size * size) throw new Error("error.bgInference");
  const data = Buffer.from(image.data);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const mx =
          clamp(((x + 0.5) * scaledWidth) / width - 0.5, 0, scaledWidth - 1) +
          padX,
        my =
          clamp(
            ((y + 0.5) * scaledHeight) / height - 0.5,
            0,
            scaledHeight - 1,
          ) + padY,
        p = sample(mask, size, size, mx, my);
      if (!Number.isFinite(p)) throw new Error("error.bgInference");
      const alpha = clamp((p - 0.02) / 0.96, 0, 1),
        i = (y * width + x) * 4;
      data[i + 3] = Math.round(data[i + 3] * alpha);
    }
  return { width, height, data };
}
function prepareGeneralInput(image, size = 320) {
  const tensor = new Float32Array(3 * size * size);
  let maximum = 1e-6;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sx = ((x + 0.5) * image.width) / size - 0.5;
      const sy = ((y + 0.5) * image.height) / size - 0.5;
      const alpha =
        sample(image.data, image.width, image.height, sx, sy, 4, 3) / 255;
      for (let c = 0; c < 3; c++) {
        const value =
          sample(image.data, image.width, image.height, sx, sy, 4, c) * alpha +
          255 * (1 - alpha);
        tensor[c * size * size + y * size + x] = value;
        maximum = Math.max(maximum, value);
      }
    }
  const mean = [0.485, 0.456, 0.406],
    std = [0.229, 0.224, 0.225];
  for (let c = 0; c < 3; c++)
    for (let i = 0; i < size * size; i++) {
      const index = c * size * size + i;
      tensor[index] = (tensor[index] / maximum - mean[c]) / std[c];
    }
  return {
    tensor,
    size,
    scaledWidth: size,
    scaledHeight: size,
    padX: 0,
    padY: 0,
  };
}
function normalizeGeneralMask(mask) {
  let min = Infinity,
    max = -Infinity;
  for (const p of mask) {
    if (!Number.isFinite(p)) throw new Error("error.bgInference");
    min = Math.min(min, p);
    max = Math.max(max, p);
  }
  if (max < 0.05 || max - min < 0.05) throw new Error("error.bgNoForeground");
  return Float32Array.from(mask, (p) => (p - min) / (max - min));
}
function assertForeground(original, output) {
  let before = 0,
    after = 0,
    visible = 0,
    strong = 0;
  for (let i = 3; i < original.data.length; i += 4) {
    before += original.data[i];
    after += output.data[i];
    if (original.data[i] > 16) visible++;
    if (output.data[i] >= 128) strong++;
  }
  if (!before || after / before < 0.02 || strong < Math.max(1, visible * 0.005))
    throw new Error("error.bgNoForeground");
  return { retainedAlpha: after / before, visible, strong };
}
module.exports = {
  prepareInput,
  applyMask,
  prepareGeneralInput,
  normalizeGeneralMask,
  assertForeground,
};
