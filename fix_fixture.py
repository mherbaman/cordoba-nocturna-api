import re

path = '/etc/easypanel/projects/cordoba-nocturna/api/code/routes/americanos_parejas.js'
with open(path, 'r') as f:
    content = f.read()

old = """      // Intercalar rondas de ambos grupos para usar canchas eficientemente
      const maxRondas = Math.max(rondasG1.length, rondasG2.length);

      const addMin = (h, m, delta) => {
        m += delta;
        h += Math.floor(m / 60);
        m = m % 60;
        return [`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, h, m];
      };

      let [hh, mm] = horaBase.split(':').map(Number);
      let rondaNum = 1;

      for (let r = 0; r < maxRondas; r++) {
        const partidos = [...(rondasG1[r] || []), ...(rondasG2[r] || [])];
        if (!partidos.length) continue;

        const hi = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
        const [hf, nhh, nmm] = addMin(hh, mm, durMin);

        let canchaActual = canchaStart;
        for (const m of partidos) {
          await client.query(`
            INSERT INTO americanos_parejas_partidos
              (americano_id, categoria_id, fase, grupo, ronda, cancha, hora_inicio, hora_fin, pareja1_id, pareja2_id)
            VALUES ($1,$2,'grupos',$3,$4,$5,$6,$7,$8,$9)`,
            [americanoId, cat.id, m.grupo, rondaNum, canchaActual, hi, hf, m.p1.id, m.p2.id]);
          totalPartidos++;
          canchaActual++;
          if (canchaActual > canchaStart + nCanchasCat - 1) canchaActual = canchaStart;
        }

        rondaNum++;
        hh = nhh; mm = nmm;
        const [,ah,am] = addMin(hh, mm, descMin);
        hh = ah; mm = am;
      }"""

new = """      // Intercalar rondas de ambos grupos para usar canchas eficientemente
      const maxRondas = Math.max(rondasG1.length, rondasG2.length);

      const addMin = (h, m, delta) => {
        m += delta;
        h += Math.floor(m / 60);
        m = m % 60;
        return [`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, h, m];
      };

      let [hh, mm] = horaBase.split(':').map(Number);
      let rondaNum = 1;

      for (let r = 0; r < maxRondas; r++) {
        const partidos = [...(rondasG1[r] || []), ...(rondasG2[r] || [])];
        if (!partidos.length) continue;

        // Dividir en slots de nCanchasCat partidos cada uno
        // Si hay más partidos que canchas, el exceso va al siguiente slot horario
        const slots = [];
        for (let i = 0; i < partidos.length; i += nCanchasCat) {
          slots.push(partidos.slice(i, i + nCanchasCat));
        }

        for (const slot of slots) {
          const hi = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
          const [hf, nhh, nmm] = addMin(hh, mm, durMin);

          let canchaActual = canchaStart;
          for (const m of slot) {
            await client.query(`
              INSERT INTO americanos_parejas_partidos
                (americano_id, categoria_id, fase, grupo, ronda, cancha, hora_inicio, hora_fin, pareja1_id, pareja2_id)
              VALUES ($1,$2,'grupos',$3,$4,$5,$6,$7,$8,$9)`,
              [americanoId, cat.id, m.grupo, rondaNum, canchaActual, hi, hf, m.p1.id, m.p2.id]);
            totalPartidos++;
            canchaActual++;
          }

          rondaNum++;
          hh = nhh; mm = nmm;
          const [,ah,am] = addMin(hh, mm, descMin);
          hh = ah; mm = am;
        }
      }"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print("OK - reemplazo exitoso")
else:
    print("ERROR - bloque no encontrado")
