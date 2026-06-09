path = '/etc/easypanel/projects/cordoba-nocturna/api/code/routes/americanos_parejas.js'
with open(path, 'r') as f:
    content = f.read()

# ── FIX 1: Posiciones — restar resultado anterior antes de sumar ──────
old_pos = """    // Actualizar posiciones
    const updatePos = async (parejaId, gfavor, gcontra, gano) => {
      await client.query(`
        UPDATE americanos_parejas_posiciones SET
          partidos_jugados = partidos_jugados + 1,
          partidos_ganados = partidos_ganados + $1,
          games_favor = games_favor + $2,
          games_contra = games_contra + $3,
          diferencia = diferencia + $4,
          puntos = puntos + $5
        WHERE americano_id=$6 AND categoria_id=$7 AND pareja_id=$8`,
        [gano?1:0, gfavor, gcontra, gfavor-gcontra, gano?3:0, p.americano_id, p.categoria_id, parejaId]);
    };
    await updatePos(p.pareja1_id, games_pareja1, games_pareja2, ganador_id===p.pareja1_id);
    await updatePos(p.pareja2_id, games_pareja2, games_pareja1, ganador_id===p.pareja2_id);"""

new_pos = """    // Actualizar posiciones — restar resultado anterior si el partido ya estaba jugado
    if (p.estado === 'jugado' && p.games_pareja1 != null) {
      // Restar el resultado anterior
      const prevGanador = p.ganador_id;
      const restarPos = async (parejaId, gfavor, gcontra, gano) => {
        await client.query(`
          UPDATE americanos_parejas_posiciones SET
            partidos_jugados = partidos_jugados - 1,
            partidos_ganados = partidos_ganados - $1,
            games_favor = games_favor - $2,
            games_contra = games_contra - $3,
            diferencia = diferencia - $4,
            puntos = puntos - $5
          WHERE americano_id=$6 AND categoria_id=$7 AND pareja_id=$8`,
          [gano?1:0, gfavor, gcontra, gfavor-gcontra, gano?3:0, p.americano_id, p.categoria_id, parejaId]);
      };
      await restarPos(p.pareja1_id, p.games_pareja1, p.games_pareja2, prevGanador===p.pareja1_id);
      await restarPos(p.pareja2_id, p.games_pareja2, p.games_pareja1, prevGanador===p.pareja2_id);
    }
    const updatePos = async (parejaId, gfavor, gcontra, gano) => {
      await client.query(`
        UPDATE americanos_parejas_posiciones SET
          partidos_jugados = partidos_jugados + 1,
          partidos_ganados = partidos_ganados + $1,
          games_favor = games_favor + $2,
          games_contra = games_contra + $3,
          diferencia = diferencia + $4,
          puntos = puntos + $5
        WHERE americano_id=$6 AND categoria_id=$7 AND pareja_id=$8`,
        [gano?1:0, gfavor, gcontra, gfavor-gcontra, gano?3:0, p.americano_id, p.categoria_id, parejaId]);
    };
    await updatePos(p.pareja1_id, games_pareja1, games_pareja2, ganador_id===p.pareja1_id);
    await updatePos(p.pareja2_id, games_pareja2, games_pareja1, ganador_id===p.pareja2_id);"""

# ── FIX 2: generarBracket — manejar un solo grupo y cualquier cantidad ──
old_bracket = """  const grupo1 = pos.filter(p => parseInt(p.grupo) === 1);
  const grupo2 = pos.filter(p => parseInt(p.grupo) === 2);

  if (!grupo1.length || !grupo2.length) return;

  const { rows: [am] } = await client.query('SELECT * FROM americanos_parejas WHERE id=$1', [americanoId]);

  // Verificar partidos existentes de eliminatorias para este americano+categoría
  const { rows: existentes } = await client.query(
    "SELECT COUNT(*) as cnt FROM americanos_parejas_partidos WHERE americano_id=$1 AND categoria_id=$2 AND fase!='grupos'",
    [americanoId, categoriaId]);
  if (parseInt(existentes[0].cnt) > 0) return; // Ya generado

  // Si hay 2 grupos de 1, es directamente final
  if (grupo1.length === 1 && grupo2.length === 1) {
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'final',1,1,$3,$4)`,
      [americanoId, categoriaId, grupo1[0].pareja_id, grupo2[0].pareja_id]);
    return;
  }

  // Semifinales: 1ro G1 vs 2do G2, 1ro G2 vs 2do G1
  if (grupo1.length >= 2 && grupo2.length >= 2) {
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'semifinal',1,1,$3,$4)`,
      [americanoId, categoriaId, grupo1[0].pareja_id, grupo2[1].pareja_id]);
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'semifinal',1,2,$3,$4)`,
      [americanoId, categoriaId, grupo2[0].pareja_id, grupo1[1].pareja_id]);
  } else {
    // Un grupo tiene solo 1 pareja: va directo a la final contra el 1ro del otro
    const p1 = grupo1[0].pareja_id;
    const p2 = grupo2[0].pareja_id;
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'final',1,1,$3,$4)`,
      [americanoId, categoriaId, p1, p2]);
  }"""

new_bracket = """  const grupo1 = pos.filter(p => parseInt(p.grupo) === 1);
  const grupo2 = pos.filter(p => parseInt(p.grupo) === 2);

  // Verificar partidos existentes de eliminatorias para este americano+categoría
  const { rows: existentes } = await client.query(
    "SELECT COUNT(*) as cnt FROM americanos_parejas_partidos WHERE americano_id=$1 AND categoria_id=$2 AND fase!='grupos'",
    [americanoId, categoriaId]);
  if (parseInt(existentes[0].cnt) > 0) return; // Ya generado

  // Caso: un solo grupo (≤4 parejas) — top2 del grupo van a final
  if (!grupo2.length) {
    if (grupo1.length < 2) return;
    if (grupo1.length === 2) {
      // Solo 2 parejas: final directa
      await client.query(`
        INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
        VALUES ($1,$2,'final',1,1,$3,$4)`,
        [americanoId, categoriaId, grupo1[0].pareja_id, grupo1[1].pareja_id]);
    } else {
      // 3 o 4 parejas: semifinales con top 4 (1vs4, 2vs3) o top 4 del grupo
      const top = grupo1.slice(0, 4);
      if (top.length >= 4) {
        await client.query(`
          INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
          VALUES ($1,$2,'semifinal',1,1,$3,$4)`,
          [americanoId, categoriaId, top[0].pareja_id, top[3].pareja_id]);
        await client.query(`
          INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
          VALUES ($1,$2,'semifinal',1,2,$3,$4)`,
          [americanoId, categoriaId, top[1].pareja_id, top[2].pareja_id]);
      } else {
        // 3 parejas: 1ro pasa directo a final, 2do vs 3ro en semi
        await client.query(`
          INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
          VALUES ($1,$2,'semifinal',1,1,$3,$4)`,
          [americanoId, categoriaId, top[1].pareja_id, top[2].pareja_id]);
        await client.query(`
          INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
          VALUES ($1,$2,'final',1,1,$3,$4)`,
          [americanoId, categoriaId, top[0].pareja_id, top[0].pareja_id]); // placeholder, se actualiza al jugar semi
      }
    }
    return;
  }

  // Caso: dos grupos — semifinales cruzadas: 1roG1 vs 2doG2, 1roG2 vs 2doG1
  if (grupo1.length === 1 && grupo2.length === 1) {
    // Solo 1 en cada grupo: final directa
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'final',1,1,$3,$4)`,
      [americanoId, categoriaId, grupo1[0].pareja_id, grupo2[0].pareja_id]);
    return;
  }

  if (grupo1.length >= 2 && grupo2.length >= 2) {
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'semifinal',1,1,$3,$4)`,
      [americanoId, categoriaId, grupo1[0].pareja_id, grupo2[1].pareja_id]);
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'semifinal',1,2,$3,$4)`,
      [americanoId, categoriaId, grupo2[0].pareja_id, grupo1[1].pareja_id]);
  } else {
    // Un grupo tiene solo 1 pareja: final directa contra el 1ro del otro
    const p1 = grupo1[0].pareja_id;
    const p2 = grupo2[0].pareja_id;
    await client.query(`
      INSERT INTO americanos_parejas_partidos (americano_id,categoria_id,fase,ronda,cancha,pareja1_id,pareja2_id)
      VALUES ($1,$2,'final',1,1,$3,$4)`,
      [americanoId, categoriaId, p1, p2]);
  }"""

ok1 = old_pos in content
ok2 = old_bracket in content

if ok1:
    content = content.replace(old_pos, new_pos)
    print("OK - Fix 1 posiciones aplicado")
else:
    print("ERROR - Fix 1 bloque no encontrado")

if ok2:
    content = content.replace(old_bracket, new_bracket)
    print("OK - Fix 2 bracket aplicado")
else:
    print("ERROR - Fix 2 bloque no encontrado")

if ok1 or ok2:
    with open(path, 'w') as f:
        f.write(content)
