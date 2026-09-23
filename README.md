# Edward's HTML Beauty Lab

An offline-first visual editor for AI-generated HTML presentations and reports.

Current version: **v1.10** (2026-09-23). [Open the editor](https://code-356.github.io/beauty-lab/) · [Changelog / 更新日志](CHANGELOG.md)

### What's new in v1.10

- Text editing no longer triggers the original page's Space/navigation shortcuts, including during IME composition.
- **More actions → Export PNG** captures the current canvas or full document at 1× or 2× resolution, independent of editor zoom.
- Includes missing-resource warnings, image size limits, cancellation and stale/duplicate download protection.
- Updated bilingual guide and offline package. See the [changelog](CHANGELOG.md) for validation and capture limitations.

## Open the editor

Open `index.html` through the GitHub Pages website. The editor runs entirely in the browser and supports opening local HTML files, visual text and style editing, dropdown option editing, image insertion and replacement, preview, export, direct save where supported, and printing to PDF.

## Privacy

Files selected in the editor are processed locally in the browser. Beauty Lab does not upload report content to a server and does not require an account or API key.

## User guide

The bilingual guide is available at `Beauty-Lab-User-Guide.html` and from **More actions > User Guide** inside the editor.

## Offline package

Use **More actions > Download Offline Package** to download `Beauty-Lab-Offline.zip` directly from the GitHub repository.

## Browser support

Use a current version of Microsoft Edge or Google Chrome. Some advanced browser APIs, including direct overwrite of a local file, depend on browser permissions and may behave differently when the editor is opened from a public website.
