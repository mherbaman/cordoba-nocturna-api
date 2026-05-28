for filepath in [
    '/etc/easypanel/projects/cordoba-nocturna/app/code/public/padelclub.html',
    '/etc/easypanel/projects/cordoba-nocturna/api/code/public/padelclub.html'
]:
    with open(filepath, 'r') as f:
        content = f.read()

    content = content.replace(
        'await apiAdmin("/auth/admin-login", {method:"POST", body:JSON.stringify({email, password})});',
        'await apiAdmin("/superadmin/login-negocio", {method:"POST", body:JSON.stringify({email, password})});'
    )
    content = content.replace(
        'adminToken = data.token;\n    adminData  = data.admin;\n    localStorage.setItem("neg_token", adminToken);\n    localStorage.setItem("neg_admin", JSON.stringify(adminData));\n    initApp();',
        'adminToken  = data.token;\n    adminData   = data.admin;\n    negocioData = data.negocio;\n    localStorage.setItem("neg_token", adminToken);\n    localStorage.setItem("neg_admin", JSON.stringify(adminData));\n    localStorage.setItem("neg_negocio", JSON.stringify(negocioData));\n    initApp();'
    )

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"✅ Fix aplicado en {filepath}")
