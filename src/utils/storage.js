/**
 * LocalStorage utilities for game persistence
 */

const STORAGE_KEY = 'coloring-app-saves';

/**
 * Save game state
 * @param {string} gameId 
 * @param {object} state 
 */
export function saveGame(gameId, state) {
  try {
    const saves = getAllSaves();
    saves[gameId] = {
      ...state,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

/**
 * Load game state
 * @param {string} gameId 
 * @returns {object|null}
 */
export function loadGame(gameId) {
  try {
    const saves = getAllSaves();
    return saves[gameId] || null;
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
}

/**
 * Delete a saved game
 * @param {string} gameId 
 */
export function deleteGame(gameId) {
  try {
    const saves = getAllSaves();
    delete saves[gameId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
  } catch (e) {
    console.error('Failed to delete game:', e);
  }
}

/**
 * Get all saved games
 * @returns {object}
 */
export function getAllSaves() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Failed to get saves:', e);
    return {};
  }
}

/**
 * List saved games with metadata
 * @returns {Array<{id: string, savedAt: number, thumbnail: string}>}
 */
export function listSavedGames() {
  const saves = getAllSaves();
  return Object.entries(saves).map(([id, data]) => ({
    id,
    savedAt: data.savedAt,
    thumbnail: data.thumbnail,
    progress: data.coloredRegions?.length / data.totalRegions || 0
  }));
}

/**
 * Generate a unique game ID
 * @returns {string}
 */
export function generateGameId() {
  return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Store image as base64 for later retrieval
 * @param {string} gameId 
 * @param {string} imageDataUrl 
 */
export function saveImageData(gameId, imageDataUrl) {
  try {
    localStorage.setItem(`${STORAGE_KEY}-img-${gameId}`, imageDataUrl);
  } catch (e) {
    console.error('Failed to save image (may be too large):', e);
  }
}

/**
 * Load stored image
 * @param {string} gameId 
 * @returns {string|null}
 */
export function loadImageData(gameId) {
  try {
    return localStorage.getItem(`${STORAGE_KEY}-img-${gameId}`);
  } catch (e) {
    console.error('Failed to load image:', e);
    return null;
  }
}
