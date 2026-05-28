with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/admin.html', 'r') as f:
    content = f.read()

# Agregar botón de email en la fila junto al de reset password
old = """      <td><button onclick="resetPassword('${u.id}','${u.nombre}')" style="background:rgba(255,45,120,.15);border:1px solid rgba(255,45,120,.3);color:#ff2d78;padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">🔑 Reset</button></td>"""

new = """      <td style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <button onclick="resetPassword('${u.id}','${u.nombre}')" style="background:rgba(255,45,120,.15);border:1px solid rgba(255,45,120,.3);color:#ff2d78;padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">🔑 Reset</button>
        ${u.email_bienvenida_enviado
          ? `<button onclick="enviarBienvenida('${u.id}','${u.nombre}',this)" style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);color:#22c55e;padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer" title="Ya recibió el email">✅ Reenviar</button>`
          : `<button onclick="enviarBienvenida('${u.id}','${u.nombre}',this)" style="background:rgba(34,197,94,.2);border:1px solid rgba(34,197,94,.4);color:#22c55e;padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">📧 Enviar</button>`
        }
      </td>"""

if old in content:
    content = content.replace(old, new)
    print("✅ Botones agregados en la fila")
else:
    print("❌ No encontró el texto")

# Agregar función enviarBienvenida
old_fn = "async function resetPassword("
new_fn = """async function enviarBienvenida(id, nombre, btn) {
  const original = btn.innerHTML;
  btn.innerHTML = '⏳';
  btn.disabled = true;
  try {
    await apiAdmin(`/auth/enviar-bienvenida/${id}`, { method:'POST' });
    btn.innerHTML = '✅ Enviado';
    btn.style.background = 'rgba(34,197,94,.08)';
    btn.style.borderColor = 'rgba(34,197,94,.2)';
    setTimeout(() => { btn.innerHTML = '✅ Reenviar'; btn.disabled = false; }, 2000);
  } catch(err) {
    alert('Error: ' + err.message);
    btn.innerHTML = original;
    btn.disabled = false;
  }
}
async function resetPassword("""

if "async function resetPassword(" in content:
    content = content.replace(old_fn, new_fn)
    print("✅ Función enviarBienvenida agregada")
else:
    print("❌ No encontró resetPassword")

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/admin.html', 'w') as f:
    f.write(content)
print("✅ Fix completo")
