"""Build the single-file claude.ai artifact from the site sources (same code, inlined)."""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
html = (ROOT / 'index.html').read_text()
head, body = html.split('<body>', 1)
body = body.replace('</body>', '').replace('</html>', '')
title = re.search(r'<title>.*?</title>', head).group(0)
fonts = '\n'.join(l for l in head.splitlines() if 'fonts.g' in l)
css = (ROOT / 'css/app.css').read_text()
css = css.split('\n', 3)[3] if css.startswith('/* reset') else css  # the artifact host supplies the reset
def inline(m):
    src = m.group(1)
    if src.startswith('vendor/astronomy'): return '<script src="https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js"></script>'
    if src.startswith('vendor/lightweight'): return '<script src="https://cdn.jsdelivr.net/npm/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"></script>'
    if src == 'js/pwa.js': return ''
    return '<script>\n' + (ROOT / src).read_text() + '\n</script>'
body = re.sub(r'<script src="([^"]+)" defer></script>', inline, body)
out = f'{title}\n<meta name="claude:viewport-fit-sides" content="cover">\n{fonts}\n<style>\n{css}\n</style>\n{body.strip()}\n'
(ROOT / 'dist').mkdir(exist_ok=True)
(ROOT / 'dist/gann-scanner-artifact.html').write_text(out)
print('wrote dist/gann-scanner-artifact.html', len(out))
