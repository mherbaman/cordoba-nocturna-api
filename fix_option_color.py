with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    content = f.read()

# Agregar style a todas las options de zona
content = content.replace(
    '<option value="">📍 Todas las zonas</option>',
    '<option value="" style="color:#000;background:#fff">📍 Todas las zonas</option>'
)
content = content.replace(
    '<option value="CBA Centro">CBA Centro</option>',
    '<option value="CBA Centro" style="color:#000;background:#fff">CBA Centro</option>'
)
content = content.replace(
    '<option value="CBA Norte">CBA Norte</option>',
    '<option value="CBA Norte" style="color:#000;background:#fff">CBA Norte</option>'
)
content = content.replace(
    '<option value="CBA Sur">CBA Sur</option>',
    '<option value="CBA Sur" style="color:#000;background:#fff">CBA Sur</option>'
)
content = content.replace(
    '<option value="CBA Este">CBA Este</option>',
    '<option value="CBA Este" style="color:#000;background:#fff">CBA Este</option>'
)
content = content.replace(
    '<option value="CBA Oeste">CBA Oeste</option>',
    '<option value="CBA Oeste" style="color:#000;background:#fff">CBA Oeste</option>'
)
content = content.replace(
    '<option value="INTERIOR RIOIV">Interior RIV</option>',
    '<option value="INTERIOR RIOIV" style="color:#000;background:#fff">Interior RIV</option>'
)

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.write(content)

print("OK")
