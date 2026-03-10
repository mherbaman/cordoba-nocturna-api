# 🎶 Córdoba Nocturna — Backend API

## Guía de instalación en EasyPanel paso a paso

---

## PASO 1 — Subir el código a GitHub

1. Creá una cuenta en **github.com** si no tenés
2. Creá un repositorio nuevo llamado `cordoba-nocturna-api`
3. Subí todos estos archivos al repositorio
4. Copiá la URL del repo (ej: `https://github.com/tuusuario/cordoba-nocturna-api`)

---

## PASO 2 — Crear el proyecto en EasyPanel

1. Abrí tu EasyPanel → `tuip:3000` o el dominio que uses
2. Click en **"+ New Project"**
3. Nombre: `cordoba-nocturna`
4. Click **Create**

---

## PASO 3 — Crear la base de datos PostgreSQL

1. Dentro del proyecto, click **"+ New Service"**
2. Elegí **"PostgreSQL"** (está en las plantillas)
3. Nombre del servicio: `db`
4. Click **Create**
5. Una vez creado, click en el servicio `db`
6. Copiá el valor de **"Connection String"** — lo vas a necesitar en el Paso 5
   (tiene este formato: `postgresql://postgres:PASSWORD@db:5432/cordoba_nocturna`)

---

## PASO 4 — Crear la app Node.js

1. Dentro del proyecto, click **"+ New Service"**
2. Elegí **"App"**
3. Nombre: `api`
4. En **"Source"** elegí **"GitHub"**
5. Pegá la URL de tu repositorio
6. Click **Create**

---

## PASO 5 — Configurar las variables de entorno

1. Click en el servicio `api`
2. Ir a la pestaña **"Environment"**
3. Agregar estas variables:

```
DATABASE_URL = postgresql://postgres:TU_PASSWORD@db:5432/cordoba_nocturna
JWT_SECRET = PoNEaquiUnTextoLargoYAleatorio2026CordobaNocturna
PORT = 3000
FRONTEND_URL = https://app.tudominio.com
SESSION_EXPIRY_HOURS = 2
NODE_ENV = production
CLAVE_MAESTRA = UnaClaveSecretaParaCrearElPrimerAdmin
```

> ⚠️ Reemplazá `TU_PASSWORD` con el password que te dio EasyPanel para PostgreSQL
> ⚠️ Cambiá `JWT_SECRET` y `CLAVE_MAESTRA` por textos largos y únicos

4. Click **Save**

---

## PASO 6 — Configurar el dominio

1. En el servicio `api`, ir a pestaña **"Domains"**
2. Click **"+ Add Domain"**
3. Dominio: `api.tudominio.com`
4. EasyPanel configura SSL automáticamente ✅

---

## PASO 7 — Deploy

1. En el servicio `api`, click **"Deploy"**
2. Esperá 2-3 minutos mientras se instala
3. Verificá que funcione abriendo: `https://api.tudominio.com`
4. Deberías ver:
```json
{
  "plataforma": "Córdoba Nocturna API",
  "estado": "🟢 Online"
}
```

---

## PASO 8 — Crear tu usuario superadmin

Esto se hace UNA SOLA VEZ desde cualquier herramienta como Postman o Thunder Client:

```
POST https://api.tudominio.com/superadmin/crear-superadmin

{
  "nombre": "Tu Nombre",
  "email": "tu@email.com",
  "password": "tu-password-seguro",
  "clave_maestra": "la-clave-maestra-que-pusiste-en-env"
}
```

---

## PASO 9 — Crear el primer negocio cliente

```
POST https://api.tudominio.com/negocios
Authorization: Bearer TU_TOKEN_SUPERADMIN

{
  "nombre": "Disco La Noche",
  "tipo": "disco",
  "slug": "disco-la-noche",
  "color_primario": "#ff2d78",
  "color_secundario": "#7c3aed",
  "dueno_nombre": "Juan García",
  "dueno_email": "juan@lanoche.com",
  "dueno_tel": "+54 351 000-0000"
}
```

---

## Endpoints disponibles

### Usuarios
- `POST /auth/registro` — Registrar nuevo usuario
- `POST /auth/login` — Login de usuario
- `GET /auth/perfil` — Ver mi perfil
- `PUT /auth/perfil` — Actualizar mi perfil

### Sesiones de noche
- `POST /sesiones/entrar` — Escanear QR y entrar a la noche
- `GET /sesiones/:id/perfiles` — Ver quién está esta noche
- `POST /sesiones/actividad` — Actualizar que sigo activo
- `POST /sesiones` — (admin) Abrir sesión de la noche
- `DELETE /sesiones/:id` — (admin) Cerrar la noche

### Matches
- `POST /matches/like` — Dar like a alguien
- `GET /matches/mis-matches` — Ver todos mis matches históricos

### Negocios
- `GET /negocios/:slug` — Info de un local
- `GET /negocios/:slug/sesion-activa` — Sesión activa de un local

### Super Admin
- `POST /superadmin/login` — Login de superadmin
- `GET /superadmin/dashboard` — Panel general
- `GET /superadmin/negocios` — Todos los clientes
- `GET /superadmin/usuarios` — Todos los usuarios
