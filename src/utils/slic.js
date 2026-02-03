/**
 * SLIC (Simple Linear Iterative Clustering) Superpixel Segmentation
 * Creates irregular regions that follow image edges
 */

// Convert RGB to LAB color space for better perceptual distance
function rgbToLab(r, g, b) {
  // Normalize RGB
  let rn = r / 255;
  let gn = g / 255;
  let bn = b / 255;

  // Convert to XYZ
  rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
  gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
  bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;

  const x = (rn * 0.4124 + gn * 0.3576 + bn * 0.1805) / 0.95047;
  const y = (rn * 0.2126 + gn * 0.7152 + bn * 0.0722) / 1.0;
  const z = (rn * 0.0193 + gn * 0.1192 + bn * 0.9505) / 1.08883;

  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return [
    (116 * fy) - 16,
    500 * (fx - fy),
    200 * (fy - fz)
  ];
}

/**
 * Run SLIC segmentation on an image
 * @param {ImageData} imageData - Canvas image data
 * @param {number} numSuperpixels - Target number of superpixels
 * @param {number} compactness - Balance between color and spatial proximity (10-40)
 * @returns {{ labels: Int32Array, numRegions: number }}
 */
export function slicSegmentation(imageData, numSuperpixels, compactness = 20) {
  const { width, height, data } = imageData;
  const numPixels = width * height;
  
  // Calculate grid step
  const step = Math.sqrt((width * height) / numSuperpixels);
  
  // Convert image to LAB
  const labImage = new Float32Array(numPixels * 3);
  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    const lab = rgbToLab(data[idx], data[idx + 1], data[idx + 2]);
    labImage[i * 3] = lab[0];
    labImage[i * 3 + 1] = lab[1];
    labImage[i * 3 + 2] = lab[2];
  }
  
  // Initialize cluster centers on grid
  const centers = [];
  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2; x < width; x += step) {
      const px = Math.floor(x);
      const py = Math.floor(y);
      const idx = py * width + px;
      centers.push({
        x: px,
        y: py,
        l: labImage[idx * 3],
        a: labImage[idx * 3 + 1],
        b: labImage[idx * 3 + 2]
      });
    }
  }
  
  // Initialize labels and distances
  const labels = new Int32Array(numPixels).fill(-1);
  const distances = new Float32Array(numPixels).fill(Infinity);
  
  // SLIC iterations
  const maxIterations = 10;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assignment step: assign pixels to nearest center
    centers.forEach((center, centerIdx) => {
      const searchRadius = step * 2;
      const xMin = Math.max(0, Math.floor(center.x - searchRadius));
      const xMax = Math.min(width - 1, Math.ceil(center.x + searchRadius));
      const yMin = Math.max(0, Math.floor(center.y - searchRadius));
      const yMax = Math.min(height - 1, Math.ceil(center.y + searchRadius));
      
      for (let y = yMin; y <= yMax; y++) {
        for (let x = xMin; x <= xMax; x++) {
          const pixelIdx = y * width + x;
          
          // Color distance
          const dl = labImage[pixelIdx * 3] - center.l;
          const da = labImage[pixelIdx * 3 + 1] - center.a;
          const db = labImage[pixelIdx * 3 + 2] - center.b;
          const colorDist = Math.sqrt(dl * dl + da * da + db * db);
          
          // Spatial distance
          const dx = x - center.x;
          const dy = y - center.y;
          const spatialDist = Math.sqrt(dx * dx + dy * dy);
          
          // Combined distance
          const dist = colorDist + (compactness / step) * spatialDist;
          
          if (dist < distances[pixelIdx]) {
            distances[pixelIdx] = dist;
            labels[pixelIdx] = centerIdx;
          }
        }
      }
    });
    
    // Update step: recalculate centers
    const sums = centers.map(() => ({ x: 0, y: 0, l: 0, a: 0, b: 0, count: 0 }));
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const label = labels[idx];
        if (label >= 0) {
          sums[label].x += x;
          sums[label].y += y;
          sums[label].l += labImage[idx * 3];
          sums[label].a += labImage[idx * 3 + 1];
          sums[label].b += labImage[idx * 3 + 2];
          sums[label].count++;
        }
      }
    }
    
    centers.forEach((center, idx) => {
      if (sums[idx].count > 0) {
        center.x = sums[idx].x / sums[idx].count;
        center.y = sums[idx].y / sums[idx].count;
        center.l = sums[idx].l / sums[idx].count;
        center.a = sums[idx].a / sums[idx].count;
        center.b = sums[idx].b / sums[idx].count;
      }
    });
    
    // Reset distances for next iteration
    distances.fill(Infinity);
  }
  
  // Enforce connectivity - merge small regions
  const newLabels = enforceConnectivity(labels, width, height, centers.length);
  
  // Count actual regions
  const uniqueLabels = new Set(newLabels);
  
  return { labels: newLabels, numRegions: uniqueLabels.size };
}

// Enforce connectivity to remove small disconnected regions
function enforceConnectivity(labels, width, height, numCenters) {
  const numPixels = width * height;
  const newLabels = new Int32Array(numPixels).fill(-1);
  const minSize = Math.floor(numPixels / numCenters / 4);
  
  let newLabel = 0;
  const dx = [-1, 0, 1, 0];
  const dy = [0, -1, 0, 1];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (newLabels[idx] >= 0) continue;
      
      // BFS to find connected component
      const queue = [[x, y]];
      const component = [idx];
      const origLabel = labels[idx];
      newLabels[idx] = newLabel;
      
      let head = 0;
      while (head < queue.length) {
        const [cx, cy] = queue[head++];
        
        for (let d = 0; d < 4; d++) {
          const nx = cx + dx[d];
          const ny = cy + dy[d];
          
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          
          const nidx = ny * width + nx;
          if (newLabels[nidx] >= 0) continue;
          if (labels[nidx] !== origLabel) continue;
          
          newLabels[nidx] = newLabel;
          component.push(nidx);
          queue.push([nx, ny]);
        }
      }
      
      // If component too small, merge with adjacent label
      if (component.length < minSize) {
        let adjLabel = -1;
        for (const pidx of component) {
          const px = pidx % width;
          const py = Math.floor(pidx / width);
          
          for (let d = 0; d < 4; d++) {
            const nx = px + dx[d];
            const ny = py + dy[d];
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            
            const nidx = ny * width + nx;
            if (newLabels[nidx] >= 0 && newLabels[nidx] !== newLabel) {
              adjLabel = newLabels[nidx];
              break;
            }
          }
          if (adjLabel >= 0) break;
        }
        
        if (adjLabel >= 0) {
          for (const pidx of component) {
            newLabels[pidx] = adjLabel;
          }
        }
      }
      
      newLabel++;
    }
  }
  
  return newLabels;
}

/**
 * Extract region boundaries for rendering
 * @param {Int32Array} labels 
 * @param {number} width 
 * @param {number} height 
 * @returns {Set<number>} Set of pixel indices that are on boundaries
 */
export function extractBoundaries(labels, width, height) {
  const boundaries = new Set();
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const label = labels[idx];
      
      // Check if any neighbor has different label
      if (x > 0 && labels[idx - 1] !== label) boundaries.add(idx);
      else if (x < width - 1 && labels[idx + 1] !== label) boundaries.add(idx);
      else if (y > 0 && labels[idx - width] !== label) boundaries.add(idx);
      else if (y < height - 1 && labels[idx + width] !== label) boundaries.add(idx);
    }
  }
  
  return boundaries;
}

/**
 * Get region data including average color and pixel list
 * @param {Int32Array} labels 
 * @param {ImageData} imageData 
 * @returns {Map<number, { pixels: number[], avgColor: number[] }>}
 */
export function getRegionData(labels, imageData) {
  const { width, height, data } = imageData;
  const regions = new Map();
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const label = labels[idx];
      
      if (!regions.has(label)) {
        regions.set(label, { pixels: [], colorSum: [0, 0, 0], count: 0 });
      }
      
      const region = regions.get(label);
      region.pixels.push(idx);
      region.colorSum[0] += data[idx * 4];
      region.colorSum[1] += data[idx * 4 + 1];
      region.colorSum[2] += data[idx * 4 + 2];
      region.count++;
    }
  }
  
  // Calculate average colors
  const result = new Map();
  regions.forEach((region, label) => {
    result.set(label, {
      pixels: region.pixels,
      avgColor: [
        Math.round(region.colorSum[0] / region.count),
        Math.round(region.colorSum[1] / region.count),
        Math.round(region.colorSum[2] / region.count)
      ]
    });
  });
  
  return result;
}
