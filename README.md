# hawkbryant.com

Photography portfolio for Hawk Bryant.

## Structure

```text
/
├── index.html          # Home / landing
├── gallery.html        # Work page shell
├── gallery.js          # Builds the gallery and controls the lightbox
├── about.html          # About page
├── style.css           # All styles
├── incoming/           # Safe upload inbox; new work starts hidden
├── scripts/            # Photo intake, optimization, and validation tools
├── data/
│   └── photos.json     # Gallery content, metadata, and display order
└── images/
    └── optimized/      # Generated responsive copies
```

## Easiest way to add photographs

Upload finished edits to `incoming/`; do not edit the gallery HTML.

1. In GitHub, open `incoming/` and choose **Add file → Upload files**.
2. Drag in one or more finished JPEG, PNG, TIFF, or WebP files.
3. Choose **Create a new branch for this commit and start a pull request**.
4. The **Photo intake pipeline** action processes the upload and updates that branch.
5. Review the new records in `data/photos.json`, add metadata and alt text, then change
   `featured` to `true` when a photograph is ready for the public Work page.

The pipeline standardizes filenames, creates a color-managed JPEG master capped at
1800px on the long edge, builds responsive copies, records the image dimensions, and
validates the catalog. New photographs default to `featured: false` and `project: "intake"`,
so an upload cannot accidentally appear in the public gallery.

You can also upload photographs in ChatGPT and provide any known year, location,
medium, camera, or film stock. The same pipeline can be run in a review branch before
anything is merged.

### Optional metadata sidecar

Add a JSON file with the same basename when metadata is already known. For example,
upload `church-in-fog.tif` and `church-in-fog.json` together:

```json
{
  "alt": "White church partly obscured by morning fog",
  "title": "Untitled",
  "year": 2026,
  "location": "North Alabama",
  "medium": "film",
  "camera": "Olympus Pen FV",
  "filmStock": "Kentmere 400",
  "project": "intake",
  "featured": false
}
```

Leave `featured` false for review. If it is true, `alt` is required.

### Local command

ImageMagick is the only system dependency (`brew install imagemagick` on macOS or
`sudo apt-get install imagemagick` on Ubuntu).

```bash
npm run photos:add -- ~/Desktop/church-in-fog.tif \
  --alt "White church partly obscured by morning fog" \
  --year 2026 \
  --location "North Alabama" \
  --medium film

npm run photos:validate
```

The local command also keeps new work hidden unless `--featured true` is supplied.

### Photograph fields

- `id`: A unique, stable identifier using lowercase letters and hyphens.
- `src`: Exact path and filename in the repository; capitalization matters.
- `alt`: A concise visual description for accessibility.
- `width` and `height`: Generated intrinsic dimensions that prevent layout shifts.
- `srcset` and `sizes`: Generated responsive-image instructions for the browser.
- `title` and `year`: Combined into the visible hover caption. Use `null` to hide either value.
- `location`, `medium`, `camera`, and `filmStock`: Stored metadata for future project pages and filters. Use `null` when unknown.
- `project`: The photograph's body of work. The current unified gallery uses `selected-work`.
- `featured`: Set to `true` to show the photograph on the Work page or `false` to retain it without displaying it there.
- `order`: Controls gallery sequence. Numbers are spaced by ten so photographs can be inserted between existing entries.

`photos.json` is strict JSON. Do not add trailing commas after the last field or photograph.

## Recommended source export

- Format: JPEG, TIFF, PNG, or WebP
- Color space: sRGB
- Resolution: full-size finished edit; the pipeline makes the web copies
- RAW files: keep them in the photo archive and export before uploading

## Deployment

The site is hosted with Cloudflare Workers Static Assets and connected to this GitHub repository. Any push to `main` triggers an automatic deployment.

- `wrangler.jsonc` identifies the repository root as the static-assets directory.
- `.assetsignore` prevents repository, workflow, intake, and script files from being published as website assets.
- Cloudflare's default `auto-trailing-slash` HTML handling preserves clean URLs such as `/gallery` and `/about`.
