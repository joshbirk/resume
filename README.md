# joshua-birk-site

Personal site for Joshua Birk. Static, self-contained, no build step.

## Structure

```
.
├── index.html              # the whole site
├── images/
│   ├── chicago-skyline.svg # hero band
│   ├── microphone.svg      # podcast card
│   ├── path.svg            # trailhead card
│   └── stage.svg           # mental health advocacy card
└── README.md
```

The CSS is inlined in `index.html`. The only external dependency is
Google Fonts (Fraunces, Manrope, JetBrains Mono).

## Deploy to GitHub Pages

1. Create a new GitHub repo. If you want the URL to be
   `https://<username>.github.io` (your root user site), name the repo
   `<username>.github.io`. Otherwise name it anything — the URL will be
   `https://<username>.github.io/<repo-name>/`.

2. Push these files to the repo:
   ```
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin git@github.com:<username>/<repo-name>.git
   git push -u origin main
   ```

3. In the repo on GitHub: **Settings → Pages**. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main** / **/ (root)**
   - Save.

4. Wait ~30 seconds. The URL will appear at the top of the Pages settings page.

## Local preview

Just open `index.html` in a browser. No server needed.

If you want hot-reload while editing:
```
python3 -m http.server 8000
# then open http://localhost:8000
```

## Editing the illustrations

The four SVGs in `images/` are hand-coded — no external tool needed.
Open any of them in a text editor; the shapes, colors, and proportions
are all readable. The color palette across the site is:

| Token       | Value     | Use                       |
|-------------|-----------|---------------------------|
| `--bg`      | `#f3ede2` | page background           |
| `--bg-card` | `#faf6ec` | card surface              |
| `--ink`     | `#1a1612` | primary text, dark areas  |
| `--accent`  | `#a14a26` | terracotta accent         |
| `--accent-2`| `#c66b3d` | lighter accent / hover    |
| `--muted`   | `#756553` | secondary text            |
| `--hair`    | `#d4c4ad` | dividers                  |

If you swap an SVG for a photograph, the card image slots are 16:9.
The hero skyline band is wider — roughly 6:1.

## Editing copy

All content lives in `index.html`. Search for the section labels in
all-caps comment headers (`<!-- ============== Hero =============== -->`)
to jump around.
