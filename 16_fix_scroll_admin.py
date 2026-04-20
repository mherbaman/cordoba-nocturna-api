ARCHIVO = 'public/admin.html'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

# Agregar scroll to top en navTo
viejo = "  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));"
nuevo = "  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));\n  window.scrollTo(0,0);"

html = html.replace(viejo, nuevo)
print("OK scroll to top en navTo")

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)
