old = """async function initApp() {
  try {
    const negocios = await apiAdmin("/superadmin/mis-negocios");
    negocioData = negocios[0];
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").style.display = "flex";
    document.getElementById("top-nombre").textContent = negocioData.nombre;
    document.getElementById("top-tipo").textContent   = negocioData.tipo || "Club de Pádel";
    cargarDashboard();
    navTo("dashboard", document.querySelector(".tab"));
  } catch(err) {
    alert("Error al cargar el club: " + err.message);
    doLogout();
  }
}"""

new = """async function initApp() {
  try {
    negocioData = negocioData || JSON.parse(localStorage.getItem("neg_negocio") || "null");
    if (!negocioData) {
      const negocios = await apiAdmin("/superadmin/mis-negocios");
      negocioData = negocios[0];
    }
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").style.display = "flex";
    document.getElementById("top-nombre").textContent = negocioData.nombre;
    document.getElementById("top-tipo").textContent   = negocioData.tipo || "Club de Pádel";
    cargarDashboard();
    navTo("dashboard", document.querySelector(".tab"));
  } catch(err) {
    alert("Error al cargar el club: " + err.message);
    doLogout();
  }
}"""

for filepath in [
    '/etc/easypanel/projects/cordoba-nocturna/app/code/public/padelclub.html',
    '/etc/easypanel/projects/cordoba-nocturna/api/code/public/padelclub.html'
]:
    with open(filepath, 'r') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        print(f"✅ Fix aplicado en {filepath}")
    else:
        print(f"❌ No encontró en {filepath}")
    with open(filepath, 'w') as f:
        f.write(content)
