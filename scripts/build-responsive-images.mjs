#!/usr/bin/env node

import { buildResponsiveSet, loadCatalog, saveCatalog } from './photo-tools.mjs';

const argumentsSet = new Set(process.argv.slice(2));
const unknownArguments = [...argumentsSet].filter(
  (argument) => argument !== '--all' && argument !== '--force'
);

if (unknownArguments.length > 0) {
  console.error(`Unknown option: ${unknownArguments.join(', ')}`);
  process.exit(1);
}

const includeHidden = argumentsSet.has('--all');
const force = argumentsSet.has('--force');
const catalog = loadCatalog();
const targets = catalog.photos.filter((photo) => includeHidden || photo.featured !== false);

let generated = 0;

for (const photo of targets) {
  const result = buildResponsiveSet(photo, { force });
  generated += result.generated;
  console.log(
    `${photo.id}: ${result.generated ? `generated ${result.generated}` : 'responsive files current'}`
  );
}

saveCatalog(catalog);

console.log(
  `Responsive image build complete: ${targets.length} photographs, ${generated} files generated.`
);
