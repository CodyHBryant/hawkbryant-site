#!/usr/bin/env node

import fs from 'node:fs';
import {
  defaultImageSizes,
  identifyImageDimensions,
  loadCatalog,
  resolveFromRoot
} from './photo-tools.mjs';

if (process.argv.length > 2) {
  console.error(`Unknown option: ${process.argv.slice(2).join(', ')}`);
  process.exit(1);
}

const catalog = loadCatalog();
const errors = [];
const warnings = [];
const ids = new Set();
const orders = new Set();
const sources = new Set();

if (catalog.schemaVersion !== 1) {
  errors.push(`Unsupported schemaVersion: ${catalog.schemaVersion}`);
}

for (const [index, photo] of catalog.photos.entries()) {
  const label = photo.id || `record ${index + 1}`;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(photo.id || '')) {
    errors.push(`${label}: id must use lowercase letters, numbers, and hyphens.`);
  }
  if (ids.has(photo.id)) errors.push(`${label}: duplicate id.`);
  ids.add(photo.id);

  if (!Number.isFinite(photo.order)) errors.push(`${label}: order must be numeric.`);
  if (orders.has(photo.order)) errors.push(`${label}: duplicate order ${photo.order}.`);
  orders.add(photo.order);

  if (typeof photo.featured !== 'boolean') {
    errors.push(`${label}: featured must be true or false.`);
  }
  if (typeof photo.src !== 'string' || !photo.src) {
    errors.push(`${label}: src is required.`);
  } else {
    if (photo.src.includes('..')) errors.push(`${label}: src cannot traverse directories.`);
    if (!fs.existsSync(resolveFromRoot(photo.src))) {
      errors.push(`${label}: missing source file ${photo.src}.`);
    }
    if (sources.has(photo.src)) errors.push(`${label}: duplicate source path ${photo.src}.`);
    sources.add(photo.src);

    if (
      fs.existsSync(resolveFromRoot(photo.src)) &&
      (photo.featured || photo.width !== undefined || photo.height !== undefined)
    ) {
      const dimensions = identifyImageDimensions(resolveFromRoot(photo.src));

      if (photo.width !== dimensions.width || photo.height !== dimensions.height) {
        errors.push(
          `${label}: width and height must match the source (${dimensions.width}x${dimensions.height}).`
        );
      }
    }
  }

  if (typeof photo.alt !== 'string') {
    errors.push(`${label}: alt must be a string.`);
  } else if (photo.featured && !photo.alt.trim()) {
    errors.push(`${label}: featured photographs require descriptive alt text.`);
  } else if (!photo.featured && !photo.alt.trim()) {
    warnings.push(`${label}: hidden intake photograph still needs alt text before publishing.`);
  }

  if (photo.featured && !photo.srcset) {
    errors.push(`${label}: featured photograph is missing responsive sources.`);
  }

  if (photo.srcset !== undefined) {
    if (typeof photo.srcset !== 'string' || !photo.srcset.trim()) {
      errors.push(`${label}: srcset must be a non-empty string.`);
    } else {
      const variants = photo.srcset.split(',').map((variant) => variant.trim());
      let previousWidth = 0;

      for (const variant of variants) {
        const match = variant.match(/^(.+)\s+(\d+)w$/);

        if (!match) {
          errors.push(`${label}: invalid srcset entry ${variant}.`);
          continue;
        }

        const [, variantPath, widthText] = match;
        const width = Number(widthText);

        if (width <= previousWidth) {
          errors.push(`${label}: srcset widths must increase.`);
        }
        previousWidth = width;

        if (!fs.existsSync(resolveFromRoot(variantPath))) {
          errors.push(`${label}: missing responsive file ${variantPath}.`);
        } else {
          const dimensions = identifyImageDimensions(resolveFromRoot(variantPath));

          if (dimensions.width !== width) {
            errors.push(
              `${label}: ${variantPath} is ${dimensions.width}px wide, not its ${width}w descriptor.`
            );
          }
        }
      }
    }

    if (photo.sizes !== defaultImageSizes) {
      errors.push(`${label}: sizes does not match the gallery layout default.`);
    }
  }

  if (photo.year !== null && photo.year !== undefined && !Number.isInteger(photo.year)) {
    errors.push(`${label}: year must be an integer or null.`);
  }
  if (typeof photo.project !== 'string' || !photo.project.trim()) {
    errors.push(`${label}: project is required.`);
  }
}

for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (errors.length > 0) {
  for (const error of errors) console.error(`Error: ${error}`);
  console.error(`Photo validation failed with ${errors.length} error(s).`);
  process.exit(1);
}

const featuredCount = catalog.photos.filter((photo) => photo.featured).length;
const optimizedBytes = fs.existsSync(resolveFromRoot('images/optimized'))
  ? fs
      .readdirSync(resolveFromRoot('images/optimized'))
      .reduce(
        (total, filename) =>
          total + fs.statSync(resolveFromRoot(`images/optimized/${filename}`)).size,
        0
      )
  : 0;

console.log(
  `Photo validation passed: ${catalog.photos.length} cataloged, ${featuredCount} featured, ` +
  `${warnings.length} warning(s), ${(optimizedBytes / 1024 / 1024).toFixed(2)} MiB responsive assets.`
);
