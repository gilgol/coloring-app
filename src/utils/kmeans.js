/**
 * K-means clustering for color quantization
 */

// Calculate Euclidean distance between two RGB colors
function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

// Initialize centroids using k-means++ algorithm
function initializeCentroids(pixels, k) {
  const centroids = [];
  
  // Pick first centroid randomly
  const firstIdx = Math.floor(Math.random() * pixels.length);
  centroids.push([...pixels[firstIdx]]);
  
  // Pick remaining centroids with probability proportional to distance squared
  while (centroids.length < k) {
    const distances = pixels.map(pixel => {
      const minDist = Math.min(...centroids.map(c => colorDistance(pixel, c)));
      return minDist * minDist;
    });
    
    const sum = distances.reduce((a, b) => a + b, 0);
    let random = Math.random() * sum;
    
    for (let i = 0; i < pixels.length; i++) {
      random -= distances[i];
      if (random <= 0) {
        centroids.push([...pixels[i]]);
        break;
      }
    }
  }
  
  return centroids;
}

// Assign each pixel to nearest centroid
function assignToClusters(pixels, centroids) {
  return pixels.map(pixel => {
    let minDist = Infinity;
    let cluster = 0;
    
    centroids.forEach((centroid, idx) => {
      const dist = colorDistance(pixel, centroid);
      if (dist < minDist) {
        minDist = dist;
        cluster = idx;
      }
    });
    
    return cluster;
  });
}

// Recalculate centroids as mean of assigned pixels
function updateCentroids(pixels, assignments, k) {
  const sums = Array(k).fill(null).map(() => [0, 0, 0]);
  const counts = Array(k).fill(0);
  
  pixels.forEach((pixel, idx) => {
    const cluster = assignments[idx];
    sums[cluster][0] += pixel[0];
    sums[cluster][1] += pixel[1];
    sums[cluster][2] += pixel[2];
    counts[cluster]++;
  });
  
  return sums.map((sum, idx) => {
    if (counts[idx] === 0) return [128, 128, 128];
    return [
      Math.round(sum[0] / counts[idx]),
      Math.round(sum[1] / counts[idx]),
      Math.round(sum[2] / counts[idx])
    ];
  });
}

// Check if centroids have converged
function hasConverged(oldCentroids, newCentroids, threshold = 1) {
  return oldCentroids.every((old, idx) => 
    colorDistance(old, newCentroids[idx]) < threshold
  );
}

/**
 * Run k-means clustering on image pixels
 * @param {number[][]} pixels - Array of [r, g, b] pixels
 * @param {number} k - Number of clusters (colors)
 * @param {number} maxIterations - Maximum iterations
 * @returns {{ centroids: number[][], assignments: number[] }}
 */
export function kMeans(pixels, k, maxIterations = 20) {
  if (pixels.length === 0) return { centroids: [], assignments: [] };
  if (pixels.length < k) k = pixels.length;
  
  let centroids = initializeCentroids(pixels, k);
  let assignments = [];
  
  for (let i = 0; i < maxIterations; i++) {
    assignments = assignToClusters(pixels, centroids);
    const newCentroids = updateCentroids(pixels, assignments, k);
    
    if (hasConverged(centroids, newCentroids)) break;
    centroids = newCentroids;
  }
  
  return { centroids, assignments };
}

/**
 * Sample pixels from image data for faster processing
 * @param {ImageData} imageData 
 * @param {number} sampleRate - Sample every nth pixel
 * @returns {number[][]}
 */
export function samplePixels(imageData, sampleRate = 4) {
  const pixels = [];
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    // Skip very dark or very light pixels
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a > 128) { // Skip transparent pixels
      pixels.push([r, g, b]);
    }
  }
  
  return pixels;
}

/**
 * Find nearest color in palette
 * @param {number[]} color - [r, g, b]
 * @param {number[][]} palette - Array of [r, g, b]
 * @returns {number} Index of nearest color
 */
export function findNearestColor(color, palette) {
  let minDist = Infinity;
  let nearest = 0;
  
  palette.forEach((paletteColor, idx) => {
    const dist = colorDistance(color, paletteColor);
    if (dist < minDist) {
      minDist = dist;
      nearest = idx;
    }
  });
  
  return nearest;
}
