/**
 * Singleton face-api.js model loader.
 *
 * Call loadFaceModels() from anywhere — it always returns the SAME Promise.
 * This means:
 *   - Models start downloading the instant index.js imports this file.
 *   - Calling loadFaceModels() again just awaits the already-in-flight download.
 *   - Zero double-loading, zero race conditions.
 */
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

let _promise = null;

export function loadFaceModels() {
  if (_promise) return _promise;

  // Already loaded from a previous session (e.g. hot-reload)
  if (
    faceapi.nets.tinyFaceDetector.isLoaded &&
    faceapi.nets.faceLandmark68Net.isLoaded &&
    faceapi.nets.faceRecognitionNet.isLoaded
  ) {
    _promise = Promise.resolve();
    return _promise;
  }

  _promise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(() => { /* resolved */ });

  return _promise;
}

export { faceapi };
