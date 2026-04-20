#!/usr/bin/env python3
"""
Crea la tabla partidos_publicos en la base de datos cordoba-nocturna.
Ejecutar en el VPS: python3 1_crear_tabla_partidos_publicos.py
"""

import subprocess

SQL = """
CREATE TABLE IF NOT EXISTS partidos_publicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zona VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  lugar VARCHAR(200),
  costo VARCHAR(100),
  descripcion TEXT,
  cupos INTEGER NOT NULL DEFAULT 4,
  estado VARCHAR(20) NOT NULL DEFAULT 'abierto',
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partidos_publicos_inscriptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id UUID NOT NULL REFERENCES partidos_publicos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  nombre VARCHAR(100),
  nivel VARCHAR(50),
  foto_url TEXT,
  inscripto_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partido_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_partidos_pub_fecha ON partidos_publicos(fecha);
CREATE INDEX IF NOT EXISTS idx_partidos_pub_zona ON partidos_publicos(zona);
CREATE INDEX IF NOT EXISTS idx_partidos_pub_estado ON partidos_publicos(estado);
CREATE INDEX IF NOT EXISTS idx_inscriptos_partido ON partidos_publicos_inscriptos(partido_id);
CREATE INDEX IF NOT EXISTS idx_inscriptos_usuario ON partidos_publicos_inscriptos(usuario_id);
"""

cmd = f'psql -U postgres -d cordoba-nocturna -c "{SQL}"'
result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
print("OK" if result.returncode == 0 else "ERROR", result.returncode)
