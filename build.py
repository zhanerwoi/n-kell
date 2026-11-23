"""N-KELL build.
page.html (page body fragment) is the single source. This script writes:
  index.html          — the website entry point (GitHub Pages / any static host), loads assets/*
  dist/n-kell.html    — one self-contained file (CSS + JS inlined) that opens offline
Run: python3 build.py"""
import re, pathlib
root = pathlib.Path(__file__).parent
src = (root / 'page.html').read_text(encoding='utf-8')
split = src.index('<div class="bg-glow"')
head_part, body_part = src[:split], src[split:]
META = ('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="theme-color" content="#111426">\n<link rel="icon" href="favicon.svg" type="image/svg+xml">\n'
        '<meta property="og:title" content="N-KELL — Discover yourself. Design your future.">\n'
        '<meta property="og:description" content="Self-discovery and career guidance for grade 9–11 students in Kazakhstan.">\n')
def page(head, body):
    head = head.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
    return '<!doctype html>\n<html lang="kk">\n<head>\n' + META + head + '</head>\n<body>\n' + body + '</body>\n</html>\n'
(root / 'index.html').write_text(page(head_part, body_part), encoding='utf-8')
def inline_css(m): return '<style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</style>'
def inline_js(m): return '<script>\n' + (root / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>'
one = re.sub(r'<link rel="stylesheet" href="(assets/[^"]+)">', inline_css, src)
one = re.sub(r'<script src="(assets/[^"]+)"></script>', inline_js, one)
s = one.index('<div class="bg-glow"')
fav = 'data:image/svg+xml,' + (root / 'favicon.svg').read_text(encoding='utf-8').strip().replace('#', '%23').replace('"', "'")
html = page(one[:s], one[s:]).replace('href="favicon.svg"', 'href="' + fav + '"')
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'n-kell.html').write_text(html, encoding='utf-8')
print('index.html + dist/n-kell.html', len(html), 'bytes')
