#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  buildResponsiveSet,
  createWebMaster,
  incomingDirectory,
  isSupportedImage,
  loadCatalog,
  nextPhotoOrder,
  normalizeOptionalText,
  normalizeYear,
  saveCatalog,
  slugify,
  toRepositoryPath
} from './photo-tools.mjs';

if (process.argv.length > 2) {
  console.error(`Unknown option: ${process.argv.slice(2).join(', ')}`);
  process.exit(1);
}

fs.mkdirSync(incomingDirectory, { recursive: true });

const imageFiles = fs
  .readdirSync(incomingDirectory)
  .filter((filename) => !filename.startsWith('.') && isSupportedImage(filename))
  .sort((left, right) => left.localeCompare(right));

if (imageFiles.length === 0) {
  console.log('No incoming photographs to process.');
  process.exit(0);
}

const catalog = loadCatalog();

for (const filename of imageFiles) {
  const inputPath = path.join(incomingDirectory, filename);
  const sidecarPath = path.join(incomingDirectory, `${path.parse(filename).name}.json`);
  let metadata = {};

  if (fs.existsSync(sidecarPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
    } catch (error) {
      throw new Error(`${path.basename(sidecarPath)}: invalid JSON (${error.message}).`);
    }
  }

  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
    throw new Error(`${path.basename(sidecarPath)}: metadata must be a JSON object.`);
  }
  if (metadata.featured !== undefined && typeof metadata.featured !== 'boolean') {
    throw new Error(`${path.basename(sidecarPath)}: featured must be true or false.`);
  }

  const id = slugify(metadata.id || path.parse(filename).name);
  const featured = metadata.featured === true;
  const alt = typeof metadata.alt === 'string' ? metadata.alt.trim() : '';

  if (!id) throw new Error(`${filename}: unable to create a usable ID.`);
  if (catalog.photos.some((photo) => photo.id === id)) {
    throw new Error(`${filename}: photograph ID ${id} already exists.`);
  }
  if (featured && !alt) {
    throw new Error(`${filename}: featured photographs require alt text in the sidecar JSON.`);
  }

  const masterPath = createWebMaster(inputPath, id);
  const photo = {
    id,
    src: toRepositoryPath(masterPath),
    alt,
    title: normalizeOptionalText(metadata.title),
    year: normalizeYear(metadata.year),
    location: normalizeOptionalText(metadata.location),
    medium: normalizeOptionalText(metadata.medium),
    camera: normalizeOptionalText(metadata.camera),
    filmStock: normalizeOptionalText(metadata.filmStock),
    project: normalizeOptionalText(metadata.project) || (featured ? 'selected-work' : 'intake'),
    featured,
    order: nextPhotoOrder(catalog.photos)
  };

  buildResponsiveSet(photo, { force: true });
  catalog.photos.push(photo);
  saveCatalog(catalog);
  fs.rmSync(inputPath);
  if (fs.existsSync(sidecarPath)) fs.rmSync(sidecarPath);

  console.log(`Processed ${filename} as ${id}; published: ${featured}.`);
}

console.log(`Processed ${imageFiles.length} incoming photograph(s).`);
