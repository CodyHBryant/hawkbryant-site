# hawkbryant.com

Photography portfolio for Hawk Bryant.

## Structure

```
/
├── index.html        # Home / landing
├── gallery.html      # Work / gallery grid
├── about.html        # About page
├── style.css         # All styles
└── images/           # Your image files go here
    ├── hero.jpg
    ├── covered-bridge.jpg
    ├── church-steeple.jpg
    └── ...
```

## Adding images

1. Export your images to the `images/` folder
1. In `gallery.html`, copy an existing `<figure>` block and update the `src` and `alt` attributes
1. Push to GitHub — Cloudflare Pages will deploy automatically

## Recommended export settings

- Format: JPEG
- Color space: sRGB
- Width: 1800px (long edge)
- Quality: 85–90
- Strip metadata optional

## Deployment

Hosted on Cloudflare Pages, connected to this GitHub repo.
Any push to `main` triggers an automatic deploy.
