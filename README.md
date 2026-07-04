# md-browser

File viewer lokal di browser, bergaya IDE "reading room" — explorer di kiri, viewer di kanan. Satu file server Node tanpa dependency.

## Fitur

- File explorer tree (tab **root** & **projects**), sidebar bisa di-resize
- Viewer dengan line number; file `.md` di-render sebagai markdown (toggle source/rendered)
- YAML frontmatter tampil sebagai card terpisah di kanan
- Card stats: lines, chars, dan tokens (gpt-tokenizer `o200k_base`)
- File gambar (png/jpg/gif/webp/svg/…) tampil sebagai gambar
- Bind ke localhost saja — tidak terekspos ke jaringan

## Jalankan

```sh
node server.js          # langsung
# atau
docker compose up -d    # persistent, auto-restart, mount read-only
```

Buka http://localhost:3456
