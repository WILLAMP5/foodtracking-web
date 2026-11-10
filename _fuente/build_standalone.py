"""Arma un HTML único (todo incrustado) de la portada de foodtracking-web para verla con doble clic.
Uso: python -I build_standalone.py <repo> <salida.html>
- CSS y JS en línea; imágenes como data URI; videos una sola vez como Blob (registro al final del body).
- Sin el tracker de Metricool, con noindex; enlaces internos a la web publicada.
"""
import base64, json, mimetypes, os, re, sys

repo, out = sys.argv[1], sys.argv[2]
html = open(os.path.join(repo, 'index.html'), encoding='utf-8').read()

def rd(p, mode='r'):
    with open(os.path.join(repo, p), mode, **({} if 'b' in mode else {'encoding': 'utf-8'})) as f:
        return f.read()

def datauri(p):
    mt = mimetypes.guess_type(p)[0] or 'application/octet-stream'
    return 'data:%s;base64,%s' % (mt, base64.b64encode(rd(p, 'rb')).decode())

def must(s, a, b, count=1):
    n = s.count(a)
    assert n >= 1, ('no encontrado', a[:80])
    return s.replace(a, b) if count == 0 else s.replace(a, b, count)

# 1) quitar tracker y marcar noindex
html, n = re.subn(r'<script>function loadScript\(a\).*?</script>\s*', '', html, flags=re.S)
assert n in (0, 1), 'tracker'  # la copia v3 ya no trae el tracker
html = must(html, '<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex">') if '<meta charset="utf-8">' in html else html.replace('<head>', '<head>\n<meta name="robots" content="noindex">', 1)

# 2) CSS en línea
def css_inline(m):
    href = m.group(1).split('?')[0]
    return '<style>/* %s */\n%s\n</style>' % (href, rd(href))
html, n = re.subn(r'<link rel="stylesheet" href="(css/[^"]+)">', css_inline, html)
assert n == 5, ('css', n)  # + css/v3-movil.css

# 3) videos: registro único -> Blob URLs
vids = sorted(set(re.findall(r'(img/[\w/.-]+\.mp4)', html)))
reg = {v: base64.b64encode(rd(v, 'rb')).decode() for v in vids}
for i, v in enumerate(vids):
    html = re.sub(r'<source src="%s"' % re.escape(v), '<source data-vsrc="%s"' % v, html)
# data-video / data-lbvideo quedan con la ruta; el registro las cambia por blob antes de v2.js

# 4) imágenes como data URI (src, poster, data-full, favicon)
imgs = sorted(set(re.findall(r'"(img/[\w/.-]+\.(?:jpg|jpeg|png|webp))"', html)))
for p in imgs:
    html = html.replace('"%s"' % p, '"%s"' % datauri(p))

# 5) enlaces internos -> web publicada
html = re.sub(r'href="((?:servicios|guias|zasscan)/[^"]*|privacidad\.html[^"]*|tarjeta\.html[^"]*)"',
              lambda m: 'href="https://foodtrackingperu.com/%s"' % m.group(1), html)

# 6) scripts en línea, en el mismo orden
def js(p):
    s = rd(p)
    if p == 'js/v2.js':
        s = must(s, "if (location.protocol === 'file:') throw new Error('file');",
                 "if (location.protocol === 'file:' || window.Planta3D) throw new Error('file');")
    if p == 'js/globos.js':
        s = must(s, "tx.src = logo.getAttribute('src').replace('logo-minimalista.jpg', 'logo-texto.png').replace('logo.png', 'logo-texto.png');",
                 "tx.src = %s;" % json.dumps(datauri('img/logo-texto.png')))
        s = must(s, "im.src = f.src.replace('logo-f.png', 'logo-f-letra.png').replace('isotipo.png', 'logo-f-letra.png');",
                 "im.src = %s;" % json.dumps(datauri('img/logo-f-letra.png')))
    return s.replace('</script', '<\\/script')

registry = ("<script>/* videos incrustados: se convierten en Blob una sola vez */\n(function(){var R=%s;var U={};"
            "function u(k){if(!U[k]){var b=atob(R[k]),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);"
            "U[k]=URL.createObjectURL(new Blob([a],{type:'video/mp4'}));}return U[k];}"
            "document.querySelectorAll('source[data-vsrc]').forEach(function(s){s.src=u(s.dataset.vsrc);s.parentNode.load&&s.parentNode.load();});"
            "document.querySelectorAll('[data-video],[data-lbvideo]').forEach(function(e){['video','lbvideo'].forEach(function(k){var v=e.dataset[k];if(v&&R[v])e.dataset[k]=u(v);});});"
            "})();</script>\n") % json.dumps(reg)

def script_inline(m):
    p = m.group(1).split('?')[0]
    pre = ''
    if p == 'js/main.js':
        pre = registry
    if p == 'js/v2.js':
        pre = '<script>/* js/planta3d.js (maqueta 3D) */\n%s\n</script>\n' % js('js/planta3d.js')
    return '%s<script>/* %s */\n%s\n</script>' % (pre, p, js(p))
html, n = re.subn(r'<script src="(js/[^"]+)"(?: defer)?></script>', script_inline, html)
assert n == 7, ('js', n)  # + js/v3-movil.js

# 7) no deben quedar rutas locales
left = re.findall(r'(?:src|href|poster|data-full)="(?!data:|https?:|#|mailto:|tel:)([^"]+)"', html)
open(out, 'w', encoding='utf-8', newline='\n').write(html)
print('salida', out, round(os.path.getsize(out) / 1e6, 2), 'MB; videos', len(vids), 'imagenes', len(imgs), 'rutas locales restantes', left[:10])
