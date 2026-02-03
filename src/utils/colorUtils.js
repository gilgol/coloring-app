/**
 * Color utility functions
 */

/**
 * Convert RGB array to hex string
 * @param {number[]} rgb - [r, g, b]
 * @returns {string}
 */
export function rgbToHex(rgb) {
  return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hex string to RGB array
 * @param {string} hex 
 * @returns {number[]}
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

/**
 * Calculate color distance
 * @param {number[]} c1 
 * @param {number[]} c2 
 * @returns {number}
 */
export function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

/**
 * Convert RGB to grayscale value
 * @param {number[]} rgb 
 * @returns {number}
 */
export function rgbToGrayscale(rgb) {
  return Math.round(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
}

/**
 * Determine if color is light or dark
 * @param {number[]} rgb 
 * @returns {boolean}
 */
export function isLightColor(rgb) {
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.5;
}

/**
 * Get contrasting text color (black or white)
 * @param {number[]} rgb 
 * @returns {string}
 */
export function getContrastColor(rgb) {
  return isLightColor(rgb) ? '#000000' : '#ffffff';
}

/**
 * Lighten a color
 * @param {number[]} rgb 
 * @param {number} amount - 0 to 1
 * @returns {number[]}
 */
export function lightenColor(rgb, amount = 0.3) {
  return rgb.map(c => Math.min(255, Math.round(c + (255 - c) * amount)));
}

/**
 * Darken a color
 * @param {number[]} rgb 
 * @param {number} amount - 0 to 1
 * @returns {number[]}
 */
export function darkenColor(rgb, amount = 0.3) {
  return rgb.map(c => Math.max(0, Math.round(c * (1 - amount))));
}

/**
 * Sort colors by hue for a nicer palette display
 * @param {number[][]} colors 
 * @returns {number[][]}
 */
export function sortColorsByHue(colors) {
  return [...colors].sort((a, b) => {
    const hueA = rgbToHsl(a)[0];
    const hueB = rgbToHsl(b)[0];
    return hueA - hueB;
  });
}

/**
 * Convert RGB to HSL
 * @param {number[]} rgb 
 * @returns {number[]} [h, s, l] where h is 0-360, s and l are 0-1
 */
export function rgbToHsl(rgb) {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return [h * 360, s, l];
}
