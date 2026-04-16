f = open('admin.html', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

lines[1029] = "          ${n.estado_pago==='mes_gratis'?'<span class=\"badge badge-yellow\">🎁 Mes gratis</span>':n.estado_pago==='vencido'?'<span class=\"badge badge-red\">⚠️ Vencido</span>':n.estado_pago==='suspendido'?'<span class=\"badge\" style=\"background:rgba(156,163,175,.15);color:#9ca3af\">⏸️ Suspendido</span>':n.estado_pago==='pago'?'<span class=\"badge badge-green\">✅ Pagó</span>':'<span class=\"badge badge-yellow\">🎁 Mes gratis</span>'}\n"

f = open('admin.html', 'w', encoding='utf-8')
f.writelines(lines)
f.close()

print('OK:', lines[1029].strip()[:300])
