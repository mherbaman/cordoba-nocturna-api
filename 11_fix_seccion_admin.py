ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

# Fix: dos atributos class → uno solo
html = html.replace(
    '<div class="section" id="page-partidos-pub" class="page" style="display:none">',
    '<div class="section page" id="page-partidos-pub" style="display:none">'
)
print("✅ Fix class duplicado")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
