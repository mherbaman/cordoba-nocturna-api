f = open('admin.html', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# L1030 — columna Estado
lines[1029] = "          ${n.estado_pago==='mes_gratis'?'<span class=\"badge badge-yellow\">🎁 Mes gratis</span>':n.estado_pago==='vencido'?'<span class=\"badge badge-red\">⚠️ Vencido</span>':n.estado_pago==='suspendido'?'<span class=\"badge\" style=\"background:rgba(156,163,175,.15);color:#9ca3af\">⏸️ Suspendido</span>':n.estado_pago==='pago'?'<span class=\"badge badge-green\">✅ Pagó</span>':'<span class=\"badge badge-yellow\">🎁 Mes gratis</span>'}\n"

# L1031 — fecha en columna Estado
lines[1030] = "          ${n.vencimiento_plan?`<span class=\"badge badge-yellow\" style=\"font-size:10px\">Vence: ${new Date(n.vencimiento_plan.slice(0,10)+'T12:00:00').toLocaleDateString('es-AR')}</span>`:''}</td>\n"

# L1034 — columna Acciones
lines[1033] = "            ${n.estado_pago==='vencido'?'<span class=\"badge badge-red\">⚠️ Vencido</span>':n.estado_pago==='suspendido'?'<span class=\"badge\" style=\"background:rgba(156,163,175,.15);color:#9ca3af\">⏸️ Suspendido</span>':n.estado_pago==='pago'?'<span class=\"badge badge-green\">✅ Pagó</span>':'<span class=\"badge badge-yellow\">🎁 Mes gratis</span>'}\n"

# L1035 — fecha en columna Acciones
lines[1034] = "            ${n.vencimiento_plan?`<span style=\"color:var(--muted);font-size:11px\">Vence: ${new Date(n.vencimiento_plan.slice(0,10)+'T12:00:00').toLocaleDateString('es-AR')}</span>`:''}\n"

f = open('admin.html', 'w', encoding='utf-8')
f.writelines(lines)
f.close()

print('L1030:', lines[1029].strip()[:120])
print('L1031:', lines[1030].strip()[:120])
print('L1034:', lines[1033].strip()[:120])
print('L1035:', lines[1034].strip()[:120])
