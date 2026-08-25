import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = path.resolve(scriptDirectory, '..');
export const catalogPath = path.join(repositoryRoot, 'data', 'photos.json');
export const incomingDirectory = path.join(repositoryRoot, 'incoming');
export const optimizedDirectory = path.join(repositoryRoot, 'images', 'optimized');
export const responsiveWidths = [800, 1600];
export const defaultImageSizes =
  '(max-width: 480px) calc(100vw - 2.5rem), ' +
  '(max-width: 768px) calc(50vw - 2rem), ' +
  '(max-width: 1400px) calc(33vw - 1.5rem), 450px';

let imageMagickCommand;

export function loadCatalog() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  if (!catalog || !Array.isArray(catalog.photos)) {
    throw new Error('data/photos.json must contain a photos array.');
  }

  return catalog;
}

export function saveCatalog(catalog) {
  const temporaryPath = `${catalogPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.renameSync(temporaryPath, catalogPath);
}

export function resolveFromRoot(relativePath) {
  const resolvedPath = path.resolve(repositoryRoot, relativePath);
  const repositoryRelative = path.relative(repositoryRoot, resolvedPath);

  if (
    repositoryRelative === '..' ||
    repositoryRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(repositoryRelative)
  ) {
    throw new Error(`Path escapes the repository: ${relativePath}`);
  }

  return resolvedPath;
}

export function toRepositoryPath(absolutePath) {
  return path.relative(repositoryRoot, absolutePath).split(path.sep).join('/');
}

export function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isSupportedImage(filename) {
  return /\.(?:jpe?g|png|tiff?|webp)$/i.test(filename);
}

export function nextPhotoOrder(photos) {
  return photos.reduce((maximum, photo) => Math.max(maximum, Number(photo.order) || 0), 0) + 10;
}

function locateImageMagick() {
  if (imageMagickCommand) return imageMagickCommand;

  const candidates = [
    process.env.IMAGE_MAGICK_COMMAND,
    'magick',
    'convert'
  ].filter(Boolean);

  for (const command of candidates) {
    const check = spawnSync(command, ['-version'], { stdio: 'ignore' });

    if (check.status === 0) {
      imageMagickCommand = command;
      return command;
    }
  }

  throw new Error(
    'ImageMagick is required. Install it with `brew install imagemagick` on macOS ' +
    'or `sudo apt-get install imagemagick` on Ubuntu.'
  );
}

function runImageMagick(argumentsList) {
  const command = locateImageMagick();
  const result = spawnSync(command, argumentsList, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'Unknown ImageMagick error').trim();
    throw new Error(`${command} failed: ${detail}`);
  }

  return result.stdout;
}

export function identifyImageDimensions(inputPath) {
  const output = runImageMagick([`${inputPath}[0]`, '-format', '%w %h', 'info:']).trim();
  const [width, height] = output.split(/\s+/).map(Number);

  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`Unable to read image dimensions for ${inputPath}`);
  }

  return { width, height };
}

export function renderJpeg(inputPath, outputPath, geometry, quality) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  runImageMagick([
    `${inputPath}[0]`,
    '-auto-orient',
    '-resize',
    geometry,
    '-colorspace',
    'sRGB',
    '-strip',
    '-interlace',
    'Plane',
    '-quality',
    String(quality),
    outputPath
  ]);
}

export function createWebMaster(inputPath, id) {
  const outputPath = path.join(repositoryRoot, 'images', `${id}.jpg`);

  if (fs.existsSync(outputPath)) {
    throw new Error(`Refusing to overwrite existing image: ${toRepositoryPath(outputPath)}`);
  }

  renderJpeg(inputPath, outputPath, '1800x1800>', 92);
  return outputPath;
}

export function buildResponsiveSet(photo, { force = false } = {}) {
  const inputPath = resolveFromRoot(photo.src);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`${photo.id}: source image not found at ${photo.src}`);
  }

  const inputModified = fs.statSync(inputPath).mtimeMs;
  const dimensions = identifyImageDimensions(inputPath);
  const targetWidths = [
    ...new Set(responsiveWidths.map((width) => Math.min(width, dimensions.width)))
  ].sort((left, right) => left - right);
  const variants = [];
  let generated = 0;

  photo.width = dimensions.width;
  photo.height = dimensions.height;

  for (const width of targetWidths) {
    const outputPath = path.join(optimizedDirectory, `${photo.id}-${width}.jpg`);
    const shouldGenerate =
      force ||
      !fs.existsSync(outputPath) ||
      fs.statSync(outputPath).mtimeMs < inputModified;

    if (shouldGenerate) {
      renderJpeg(inputPath, outputPath, `${width}x>`, width <= 800 ? 84 : 86);
      generated += 1;
    }

    variants.push({
      path: toRepositoryPath(outputPath),
      width
    });
  }

  photo.srcset = variants.map((variant) => `${variant.path} ${variant.width}w`).join(', ');
  photo.sizes = defaultImageSizes;

  return {
    files: variants.map((variant) => variant.path),
    generated
  };
}

export function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

export function normalizeYear(value) {
  if (value === undefined || value === null || value === '') return null;
  const year = Number(value);

  if (!Number.isInteger(year) || year < 1800 || year > 2200) {
    throw new Error(`Invalid year: ${value}`);
  }

  return year;
}
