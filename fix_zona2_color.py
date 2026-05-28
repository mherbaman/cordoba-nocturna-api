with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'r') as f:
    content = f.read()

content = content.replace(
    'style="color-scheme:dark;background:#030d06;flex:1"',
    'style="color-scheme:dark;background:#030d06;color:#fff;flex:1"'
)

with open('/etc/easypanel/projects/cordoba-nocturna/app/code/public/padel-connect.html', 'w') as f:
    f.write(content)

print("OK")
