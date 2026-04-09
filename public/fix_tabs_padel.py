FILE = '/etc/easypanel/projects/cordoba-nocturna/api/code/public/negocio.html'

with open(FILE, 'r') as f:
    content = f.read()

# 1. Agregar id a los tabs de padel para poder ocultarlos/mostrarlos
content = content.replace(
    '<button class="tab" onclick="navTo(\'canchas\',this)">🎾 Mis Canchas</button>',
    '<button class="tab" id="tab-canchas" onclick="navTo(\'canchas\',this)" style="display:none">🎾 Mis Canchas</button>'
)
content = content.replace(
    '<button class="tab" onclick="navTo(\'reservas\',this)">📋 Reservas</button>',
    '<button class="tab" id="tab-reservas" onclick="navTo(\'reservas\',this)" style="display:none">📋 Reservas</button>'
)

# 2. Agregar padel y cancha al APP_MAP
content = content.replace(
    "gimnasio:'index.html', crossfit:'index.html', yoga:'index.html',",
    "gimnasio:'index.html', crossfit:'index.html', yoga:'index.html',\n  padel:'padel-connect.html', cancha:'padel-connect.html',"
)

# 3. Agregar emoji de padel al iconMap
content = content.replace(
    "festival:'🎪',feria:'🎡',recital:'🎸'",
    "festival:'🎪',feria:'🎡',recital:'🎸',\n    padel:'🎾',cancha:'🎾'"
)

# 4. Mostrar tabs padel solo si el tipo es padel o cancha
content = content.replace(
    "  cargarInicio();\n}",
    """  // Mostrar tabs padel solo para clubs de padel
  const esPadel = ['padel','cancha'].includes(negocioData.tipo);
  document.getElementById('tab-canchas').style.display = esPadel ? 'block' : 'none';
  document.getElementById('tab-reservas').style.display = esPadel ? 'block' : 'none';
  cargarInicio();
}""",
    1
)

with open(FILE, 'w') as f:
    f.write(content)

print('✅ Fix tabs padel aplicado')
