#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  buildResponsiveSet,
  createWebMaster,
  isSupportedImage,
  loadCatalog,
  nextPhotoOrder,
  normalizeOptionalText,
  normalizeYear,
  resolveFromRoot,
  saveCatalog,
  slugify,
  toRepositoryPath
} from './photo-tools.mjs';

const usage = `
Add a finished photograph to the catalog.

Usage:
  node scripts/add-photo.mjs path/to/photo.jpg [options]

Options:
  --id <slug>              Stable ID and filename; defaults to the source filename
  --alt <description>      Factual visual description; required when featured
  --title <title>          Display title
  --year <year>            Four-digit year
  --location <location>    Location
  --medium <film|digital>  Capture medium
  --camera <camera>        Camera
  --film-stock <stock>     Film stock
  --project <project>      Project slug; defaults to intake
  --featured <true|false>  Publish immediately; defaults to false
  --help                   Show this help
`.trim();

function parseArguments(values) {
  const allowedOptions = new Set([
    'id',
    'alt',
    'title',
    'year',
    'location',
    'medium',
    'camera',
    'film-stock',
    'project',
    'featured',
    'help'
  ]);
  const options = {};
  const positionals = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (!value.startsWith('--')) {
      positionals.push(value);
      continue;
    }

    const key = value.slice(2);

    if (!allowedOptions.has(key)) {
      throw new Error(`Unknown option: --${key}`);
    }

    if (key === 'help') {
      options.help = true;
      continue;
    }

    const nextValue = values[index + 1];

    if (nextValue === undefined || nextValue.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    options[key] = nextValue;
    index += 1;
  }

  return { options, positionals };
}

function parseFeatured(value) {
  if (value === undefined) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('--featured must be true or false.');
}

try {
  const { options, positionals } = parseArguments(process.argv.slice(2));

  if (options.help || positionals.length === 0) {
    console.log(usage);
    process.exit(options.help ? 0 : 1);
  }

  if (positionals.length !== 1) {
    throw new Error('Provide exactly one input photograph.');
  }

  const inputPath = path.resolve(positionals[0]);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input photograph not found: ${inputPath}`);
  }

  if (!isSupportedImage(inputPath)) {
    throw new Error('Use a finished JPEG, PNG, TIFF, or WebP file.');
  }

  const catalog = loadCatalog();
  const id = slugify(options.id || path.parse(inputPath).name);
  const featured = parseFeatured(options.featured);
  const alt = options.alt ? options.alt.trim() : '';

  if (!id) throw new Error('The photograph needs a usable ID.');
  if (catalog.photos.some((photo) => photo.id === id)) {
    throw new Error(`A photograph with ID ${id} already exists.`);
  }
  if (featured && !alt) {
    throw new Error('Featured photographs require --alt with a factual description.');
  }

  const createdFiles = [];

  try {
    const masterPath = createWebMaster(inputPath, id);
    createdFiles.push(masterPath);

    const photo = {
      id,
      src: toRepositoryPath(masterPath),
      alt,
      title: normalizeOptionalText(options.title),
      year: normalizeYear(options.year),
      location: normalizeOptionalText(options.location),
      medium: normalizeOptionalText(options.medium),
      camera: normalizeOptionalText(options.camera),
      filmStock: normalizeOptionalText(options['film-stock']),
      project: normalizeOptionalText(options.project) || (featured ? 'selected-work' : 'intake'),
      featured,
      order: nextPhotoOrder(catalog.photos)
    };

    const responsive = buildResponsiveSet(photo, { force: true });
    createdFiles.push(...responsive.files.map((file) => resolveFromRoot(file)));
    catalog.photos.push(photo);
    saveCatalog(catalog);

    console.log(`Added ${id} as ${featured ? 'featured' : 'hidden for review'}.`);
    console.log(`Master: ${photo.src}`);
    console.log(`Responsive files: ${responsive.files.join(', ')}`);
  } catch (error) {
    for (const file of createdFiles) {
      if (fs.existsSync(file)) fs.rmSync(file);
    }
    throw error;
  }
} catch (error) {
  console.error(`Photo intake failed: ${error.message}`);
  process.exit(1);
}
