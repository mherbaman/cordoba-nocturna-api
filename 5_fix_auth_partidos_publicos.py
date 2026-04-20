ARCHIVO = 'routes/padel.js'

with open(ARCHIVO, 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace(
    "router.post('/partidos-publicos', authMiddleware,",
    "router.post('/partidos-publicos', authAdmin,"
)
html = html.replace(
    "router.delete('/partidos-publicos/:id', authMiddleware,",
    "router.delete('/partidos-publicos/:id', authAdmin,"
)
html = html.replace(
    "router.post('/partidos-publicos/:id/inscribirse', authMiddleware,",
    "router.post('/partidos-publicos/:id/inscribirse', authUsuario,"
)
html = html.replace(
    "router.delete('/partidos-publicos/:id/desinscribirse', authMiddleware,",
    "router.delete('/partidos-publicos/:id/desinscribirse', authUsuario,"
)

# También corregir req.usuario.id → req.usuario.id (authUsuario usa req.usuario)
# authAdmin usa req.negocio — pero para inscribirse necesitamos usuario
# Verificar que req.usuario esté bien

with open(ARCHIVO, 'w', encoding='utf-8') as f:
    f.write(html)

print("✅ authMiddleware reemplazado correctamente")
