import { useState, useCallback } from 'react';
import { kMeans, samplePixels, findNearestColor } from '../utils/kmeans';
import { slicSegmentation, getRegionData } from '../utils/slic';
import { sortColorsByHue } from '../utils/colorUtils';

const DIFFICULTY_SETTINGS = {
  beginner: { regions: 150, compactness: 25 },
  mid: { regions: 300, compactness: 20 },
  pro: { regions: 550, compactness: 15 }
};

/**
 * Hook for processing uploaded images
 */
export function useImageProcessor() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const processImage = useCallback(async (imageFile, difficulty, paletteSize) => {
    setProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Load image
      setProgress(10);
      const image = await loadImage(imageFile);
      
      // Create canvas and get image data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Limit size for performance
      const maxDimension = 800;
      let width = image.width;
      let height = image.height;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }
      
      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Extract color palette using k-means
      setProgress(30);
      await sleep(10); // Allow UI to update
      
      const pixels = samplePixels(imageData, 4);
      const { centroids: palette } = kMeans(pixels, paletteSize);
      const sortedPalette = sortColorsByHue(palette);
      
      // Run SLIC segmentation
      setProgress(50);
      await sleep(10);
      
      const settings = DIFFICULTY_SETTINGS[difficulty];
      const { labels, numRegions } = slicSegmentation(
        imageData, 
        settings.regions, 
        settings.compactness
      );
      
      // Get region data and assign colors
      setProgress(80);
      await sleep(10);
      
      const regionData = getRegionData(labels, imageData);
      
      // Assign each region to a palette color
      const regionColors = new Map();
      regionData.forEach((data, regionId) => {
        const colorIndex = findNearestColor(data.avgColor, sortedPalette);
        regionColors.set(regionId, colorIndex);
      });
      
      setProgress(100);
      
      return {
        imageData,
        width: canvas.width,
        height: canvas.height,
        palette: sortedPalette,
        labels,
        numRegions,
        regionData,
        regionColors,
        originalImage: canvas.toDataURL('image/jpeg', 0.8)
      };
      
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setProcessing(false);
    }
  }, []);

  return { processImage, processing, progress, error };
}

// Helper to load image from file
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Sleep helper for async progress updates
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default useImageProcessor;
