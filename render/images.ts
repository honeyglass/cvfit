/**
 * The pictures the renderer needs, read from PNG or JPEG and written as PNG.
 *
 * squarePhoto: the middle square of a photo, at most 600 pixels wide, to store as the CV photo.
 * circlePhoto: a photo with everything outside its inscribed circle made transparent.
 * solidPng: a rectangle in one color.
 *
 * Google Docs keeps no clipping shape of a .docx, so the circle is part of the pixels.
 *
 * @example const stored = squarePhoto(readFileSync('portrait.jpg'));
 */
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

type Pixels = { width: number; height: number; data: Uint8Array };
type Area = { left: number; top: number; right: number; bottom: number };

/** The edge of a stored photo in pixels: about 360 dpi at the size the photo has on the page. */
const PHOTO_SIDE = 600;
/** Samples per axis and pixel, so the edge of the circle is smooth. */
const SAMPLES = 4;

// A JPEG starts with FF D8; everything else goes to the PNG reader, which refuses what is no PNG.
function decoded(photo: Uint8Array): Pixels {
  const isJpeg = photo[0] === 0xff && photo[1] === 0xd8;
  if (isJpeg) return jpeg.decode(photo, { useTArray: true });
  return PNG.sync.read(Buffer.from(photo));
}

function encoded({ width, height, data }: Pixels) {
  const png = new PNG({ width, height });
  png.data = Buffer.from(data);
  return PNG.sync.write(png);
}

/**
 * @param photo - the bytes of a PNG or JPEG file
 * @returns the bytes of a square PNG, cut from the middle and shrunk to at most 600 pixels
 * @throws when the bytes are no picture
 */
export function squarePhoto(photo: Uint8Array) {
  const source = decoded(photo);
  const side = Math.min(source.width, source.height);
  const size = Math.min(side, PHOTO_SIDE);
  const left = Math.floor((source.width - side) / 2);
  const top = Math.floor((source.height - side) / 2);
  const step = side / size;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const area = {
        left: left + Math.floor(x * step),
        top: top + Math.floor(y * step),
        right: left + Math.max(Math.floor(x * step) + 1, Math.floor((x + 1) * step)),
        bottom: top + Math.max(Math.floor(y * step) + 1, Math.floor((y + 1) * step)),
      };
      data.set(average(source, area), (y * size + x) * 4);
    }
  }
  return encoded({ width: size, height: size, data });
}

// The mean color of an area, so a shrunk photo has no jagged edges.
function average(source: Pixels, area: Area) {
  const sum = [0, 0, 0, 0];
  for (let y = area.top; y < area.bottom; y++) {
    for (let x = area.left; x < area.right; x++) {
      const at = (y * source.width + x) * 4;
      for (const channel of [0, 1, 2, 3]) sum[channel] = (sum[channel] ?? 0) + (source.data[at + channel] ?? 0);
    }
  }
  const count = (area.bottom - area.top) * (area.right - area.left);
  return sum.map(value => Math.round(value / count));
}

/**
 * @param photo - the bytes of a PNG or JPEG file
 * @returns the bytes of the round PNG
 * @throws when the bytes are no picture
 */
export function circlePhoto(photo: Uint8Array) {
  const { width, height, data } = decoded(photo);
  const round = Uint8Array.from(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) round[(y * width + x) * 4 + 3] = Math.round(255 * coverage(x, y, width, height));
  }
  return encoded({ width, height, data: round });
}

// The share of a pixel that lies inside the circle, from SAMPLES x SAMPLES points.
function coverage(x: number, y: number, width: number, height: number) {
  let inside = 0;
  for (let row = 0; row < SAMPLES; row++) {
    for (let column = 0; column < SAMPLES; column++) {
      const dx = (x + (column + 0.5) / SAMPLES - width / 2) / (width / 2);
      const dy = (y + (row + 0.5) / SAMPLES - height / 2) / (height / 2);
      if (dx * dx + dy * dy <= 1) inside += 1;
    }
  }
  return inside / (SAMPLES * SAMPLES);
}

/**
 * @param width - in pixels
 * @param height - in pixels
 * @param hex - the color as six hex digits
 * @returns the bytes of the PNG
 */
export function solidPng(width: number, height: number, hex: string) {
  const color = [0, 2, 4].map(at => Number.parseInt(hex.slice(at, at + 2), 16));
  const data = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) data.set([...color, 255], pixel * 4);
  return encoded({ width, height, data });
}
