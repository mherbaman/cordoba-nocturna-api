with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    lines = f.readlines()

lines[59] = lines[59].replace(
    'color:rgba(255,255,255,.3)',
    'color:rgba(255,255,255,.9)'
)

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.writelines(lines)

print("OK")
