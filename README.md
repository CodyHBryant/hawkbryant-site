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
├── data/
│   └── photos.json     # Gallery content, metadata, and display order
└── images/             # Web-ready image files
```

## Adding a photograph

1. Export the photograph as a web-ready JPEG.
2. Upload it to the `images/` directory. New filenames should use lowercase letters and hyphens, such as `church-in-fog.jpg`.
3. Open `data/photos.json` and copy an existing photograph object.
4. Update the copied fields and give it a unique `id`.
5. Commit the image and data-file change. A push to `main` deploys automatically through Cloudflare Pages.

Example record:

```json
{
  "id": "church-in-fog",
  "src": "images/church-in-fog.jpg",
  "alt": "White church partly obscured by morning fog",
  "title": "Untitled",
  "year": 2026,
  "location": "North Alabama",
  "medium": "film",
  "camera": "Olympus Pen FV",
  "filmStock": "Kentmere 400",
  "project": "selected-work",
  "featured": true,
  "order": 170
}
```

### Photograph fields

- `id`: A unique, stable identifier using lowercase letters and hyphens.
- `src`: Exact path and filename in the repository; capitalization matters.
- `alt`: A concise visual description for accessibility.
- `title` and `year`: Combined into the visible hover caption. Use `null` to hide either value.
- `location`, `medium`, `camera`, and `filmStock`: Stored metadata for future project pages and filters. Use `null` when unknown.
- `project`: The photograph's body of work. The current unified gallery uses `selected-work`.
- `featured`: Set to `true` to show the photograph on the Work page or `false` to retain it without displaying it there.
- `order`: Controls gallery sequence. Numbers are spaced by ten so photographs can be inserted between existing entries.

`photos.json` is strict JSON. Do not add trailing commas after the last field or photograph.

## Recommended export settings

- Format: JPEG
- Color space: sRGB
- Long edge: 1800px
- Quality: 85–90
- Strip metadata: optional

## Deployment

The site is hosted on Cloudflare Pages and connected to this GitHub repository. Any push to `main` triggers an automatic deployment.
