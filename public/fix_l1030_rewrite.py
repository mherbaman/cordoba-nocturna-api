f = open('admin.html', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# Reescritura completa y limpia de L1030
lines[1029] = (
    "          ${n.estado_pago==='mes_gratis'?"
    "'<span class=\"badge badge-yellow\">\U0001f381 Mes gratis</span>':"
    "n.estado_pago==='vencido'?"
    "'<span class=\"badge badge-red\">\u26a0\ufe0f Vencido</span>':"
    "n.estado_pago==='suspendido'?"
    "'<span class=\"badge\" style=\"background:rgba(156,163,175,.15);color:#9ca3af\">\u23f8\ufe0f Suspendido</span>':"
    "n.estado_pago==='pago'?"
    "'<span class=\"badge badge-green\">\u2705 Pag\u00f3</span>':"
    "'<span class=\"badge badge-yellow\">\U0001f381 Mes gratis</span>'}\n"
)

f = open('admin.html', 'w', encoding='utf-8')
f.writelines(lines)
f.close()

print('RESULT:', lines[1029].strip())
