/**
 * Downloads face-api.js model weights from jsDelivr CDN into
 * frontend/public/models/ so they are served locally (no external CDN delay).
 *
 * Run once:  node scripts/downloadFaceModels.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
const DEST = path.join(__dirname, '..', 'public', 'models');

const FILES = [
  // Tiny face detector (~190 KB)
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  // Face landmarks 68 (~350 KB)
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  // Face recognition net (~6.2 MB — the big one)
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

function download(filename) {
  return new Promise((resolve, reject) => {
    const dest = path.join(DEST, filename);
    if (fs.existsSync(dest)) {
      console.log(`  ✓ already exists: ${filename}`);
      return resolve();
    }
    const file = fs.createWriteStream(dest);
    const url = `${BASE}/${filename}`;
    console.log(`  ↓ downloading: ${filename}`);

    const req = https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        // follow redirect
        https.get(res.headers.location, res2 => {
          res2.pipe(file);
          file.on('finish', () => file.close(resolve));
          file.on('error', reject);
        }).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', err => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

(async () => {
  console.log(`\nDownloading face-api.js model weights to:\n  ${DEST}\n`);
  for (const f of FILES) {
    await download(f);
  }
  console.log('\n✅ All models downloaded. FACE_MODEL_URL now points to /models (localhost).\n');
})().catch(err => {
  console.error('❌ Download failed:', err.message);
  process.exit(1);
});
