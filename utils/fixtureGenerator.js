// ============================================================
// fixtureGenerator.js — Algoritmo de fixture automático
// CórdobaLux — Módulo Torneos
// ============================================================
//
// Lógica:
//   - 8 parejas por grupo → 7 rondas de round robin (algoritmo círculo)
//   - Cada ronda tiene 4 partidos simultáneos
//   - Duración partido: 45 min + 15 min descanso = 60 min por ronda
//   - Distribuye rondas entre canchas y días disponibles
//   - Garantiza que ninguna pareja juega dos partidos en la misma ronda
// ============================================================

/**
 * Genera el fixture completo para un torneo.
 * Retorna array de partidos listos para insertar en partidos_torneo.
 *
 * @param {Object} torneo - row de la tabla torneos
 * @param {Array}  categorias - rows de categorias_torneo con sus parejas
 *                 cada categoria tiene .parejas = array de parejas_torneo confirmadas
 * @returns {Array} partidos - objetos para insertar en partidos_torneo
 */
function generarFixture(torneo, categorias) {
  const partidos = [];

  // Construir slots disponibles (cancha + fecha + hora)
  const slots = generarSlots(torneo);

  // Índice global de slots para asignar a cada partido
  let slotIndex = 0;

  for (const categoria of categorias) {
    const parejas = categoria.parejas.filter(p => p.estado === 'confirmada');

    if (parejas.length < 4) {
      console.warn(`Categoría ${categoria.nombre}: menos de 4 parejas confirmadas, se omite`);
      continue;
    }

    // Dividir en 2 grupos de 8 (o menos si no llega)
    const grupos = dividirEnGrupos(parejas);

    for (let grupoNum = 1; grupoNum <= grupos.length; grupoNum++) {
      const grupoParejas = grupos[grupoNum - 1];
      const rondas = generarRondasRoundRobin(grupoParejas);

      for (let rondaNum = 1; rondaNum <= rondas.length; rondaNum++) {
        const enfrentamientos = rondas[rondaNum - 1];

        for (const enfrentamiento of enfrentamientos) {
          const slot = slotIndex < slots.length ? slots[slotIndex++] : null;
          if (!slot) console.warn('Sin slot para partido — se genera sin horario asignado');

          partidos.push({
            torneo_id: torneo.id,
            categoria_id: categoria.id,
            fase: 'grupos',
            grupo: grupoNum,
            ronda: rondaNum,
            pareja1_id: enfrentamiento[0].id,
            pareja2_id: enfrentamiento[1].id,
            cancha: slot ? slot.cancha : null,
            fecha: slot ? slot.fecha : null,
            hora_inicio: slot ? slot.hora_inicio : null,
            hora_fin: slot ? slot.hora_fin : null,
            estado: 'pendiente'
          });
        }
      }
    }
  }

  return partidos;
}

/**
 * Genera todos los slots disponibles del torneo ordenados por fecha/hora/cancha.
 * Un slot = una cancha libre en un horario específico.
 *
 * El algoritmo llena slots en paralelo por cancha:
 *   Cancha 1: 09:00, 10:00, 11:00...
 *   Cancha 2: 09:00, 10:00, 11:00...
 *   ...
 *
 * Los slots se ordenan por (fecha, hora) para que partidos de la misma ronda
 * queden en el mismo bloque horario cuando hay suficientes canchas.
 */
function generarSlots(torneo) {
  const slots = [];
  const duracionTotal = torneo.duracion_partido_min + torneo.descanso_entre_rondas_min; // 60 min

  const fi = torneo.fecha_inicio instanceof Date ? torneo.fecha_inicio.toISOString().substring(0,10) : String(torneo.fecha_inicio).substring(0,10);
  const ff = torneo.fecha_fin instanceof Date ? torneo.fecha_fin.toISOString().substring(0,10) : String(torneo.fecha_fin).substring(0,10);
  const fechas = getFechasEnRango(fi, ff);

  for (const fecha of fechas) {
    // Generar bloques horarios para el día
    const bloques = generarBloques(
      torneo.hora_inicio_dia,
      torneo.hora_fin_dia,
      torneo.duracion_partido_min,
      torneo.descanso_entre_rondas_min
    );

    for (const bloque of bloques) {
      for (let cancha = 1; cancha <= torneo.cantidad_canchas; cancha++) {
        slots.push({
          fecha,
          cancha,
          hora_inicio: bloque.inicio,
          hora_fin: bloque.fin
        });
      }
    }
  }

  // Ordenar: fecha ASC, hora ASC, cancha ASC
  // Así los partidos de la misma ronda quedan agrupados por horario
  slots.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    if (a.hora_inicio !== b.hora_inicio) return a.hora_inicio < b.hora_inicio ? -1 : 1;
    return a.cancha - b.cancha;
  });

  return slots;
}

/**
 * Genera los bloques horarios de un día dado inicio, fin y duraciones.
 * Ejemplo: 09:00 a 21:00, partido 45min, descanso 15min → bloques cada 60min
 */
function generarBloques(horaInicio, horaFin, duracionMin, descansoMin) {
  const bloques = [];
  const duracionTotal = duracionMin + descansoMin;

  // Normalizar: soporta "09:00", "09:00:00", objeto Date, etc.
  const normalizarHora = (h) => {
    const str = String(h).substring(0, 5); // toma solo "HH:MM"
    return str;
  };

  let [hIni, mIni] = normalizarHora(horaInicio).split(':').map(Number);
  const [hFin, mFin] = normalizarHora(horaFin).split(':').map(Number);

  const minFin = hFin * 60 + mFin;
  let minActual = hIni * 60 + mIni;

  while (minActual + duracionMin <= minFin) {
    const minPartidoFin = minActual + duracionMin;
    bloques.push({
      inicio: minToTime(minActual),
      fin: minToTime(minPartidoFin)
    });
    minActual += duracionTotal;
  }

  return bloques;
}

/**
 * Algoritmo de round robin por círculo (circle method).
 * Para N equipos genera N-1 rondas con N/2 enfrentamientos cada una.
 * Garantiza que cada equipo juega exactamente 1 partido por ronda.
 *
 * Si N es impar, agrega un "bye" (equipo fantasma) para que quede par.
 */
function generarRondasRoundRobin(parejas) {
  let equipos = [...parejas];

  // Si impar, agregar bye
  const tieneBye = equipos.length % 2 !== 0;
  if (tieneBye) {
    equipos.push({ id: null, nombre_pareja: 'BYE' });
  }

  const n = equipos.length;
  const rondas = [];

  // El primer equipo es fijo, el resto rota
  const fijo = equipos[0];
  const rotantes = equipos.slice(1);

  for (let ronda = 0; ronda < n - 1; ronda++) {
    const enfrentamientos = [];
    const rotacionActual = rotarArray(rotantes, ronda);
    const circulo = [fijo, ...rotacionActual];

    for (let i = 0; i < n / 2; i++) {
      const equipo1 = circulo[i];
      const equipo2 = circulo[n - 1 - i];

      // Saltar partidos con BYE
      if (equipo1.id === null || equipo2.id === null) continue;

      enfrentamientos.push([equipo1, equipo2]);
    }

    if (enfrentamientos.length > 0) {
      rondas.push(enfrentamientos);
    }
  }

  return rondas;
}

/**
 * Divide el array de parejas en grupos de 8 máximo.
 * Con 16 parejas → 2 grupos de 8.
 * Con menos → puede haber 1 grupo o 2 grupos desiguales.
 */
function dividirEnGrupos(parejas) {
  // Mezclar aleatoriamente (sorteo)
  const mezcladas = shuffleArray([...parejas]);

  const n = mezcladas.length;

  // Siempre dividir en 2 grupos para que exista bracket (semis, final)
  // Mínimo 4 parejas por grupo
  let numGrupos = 2;
  if (n > 20) numGrupos = 3;
  if (n > 30) numGrupos = 4;

  // Dividir en grupos lo más equilibrados posible
  const grupos = Array.from({ length: numGrupos }, () => []);
  mezcladas.forEach((p, i) => grupos[i % numGrupos].push(p));
  return grupos;
}

/**
 * Genera los partidos de la fase eliminatoria (semis, 3er puesto, final)
 * a partir de los clasificados de cada grupo.
 *
 * Formato:
 *   Semifinal 1: 1ro Grupo A vs 2do Grupo B
 *   Semifinal 2: 1ro Grupo B vs 2do Grupo A
 *   Final: ganador SF1 vs ganador SF2
 *   3er puesto: perdedor SF1 vs perdedor SF2
 *
 * @param {Object} torneo
 * @param {Object} categoria
 * @param {Array}  posiciones - rows de posiciones_torneo ordenadas por grupo y posición
 * @param {Array}  slotsDisponibles - slots libres para asignar
 * @returns {Array} partidos eliminatorios
 */
function generarBracket(torneo, categoria, posiciones, slotsDisponibles) {
  // Obtener 1ro y 2do de cada grupo
  const grupo1 = posiciones.filter(p => p.grupo === 1).sort((a, b) => a.posicion - b.posicion);
  const grupo2 = posiciones.filter(p => p.grupo === 2).sort((a, b) => a.posicion - b.posicion);

  if (grupo1.length < 2 || grupo2.length < 2) {
    throw new Error('No hay suficientes posiciones calculadas para generar el bracket');
  }

  const primeroGrupo1 = grupo1[0];
  const segundoGrupo1 = grupo1[1];
  const primeroGrupo2 = grupo2[0];
  const segundoGrupo2 = grupo2[1];

  let slotIdx = 0;

  const getSlot = () => {
    if (slotIdx >= slotsDisponibles.length) throw new Error('Sin slots para el bracket');
    return slotsDisponibles[slotIdx++];
  };

  const sf1Slot = getSlot();
  const sf2Slot = getSlot();
  const finalSlot = getSlot();
  const tercerSlot = getSlot();

  return [
    {
      torneo_id: torneo.id,
      categoria_id: categoria.id,
      fase: 'semifinal',
      ronda: 1,
      pareja1_id: primeroGrupo1.pareja_id,
      pareja2_id: segundoGrupo2.pareja_id,
      cancha: sf1Slot.cancha,
      fecha: sf1Slot.fecha,
      hora_inicio: sf1Slot.hora_inicio,
      hora_fin: sf1Slot.hora_fin,
      estado: 'pendiente',
      // metadata para saber quién pasa a final
      _label: 'Semifinal 1'
    },
    {
      torneo_id: torneo.id,
      categoria_id: categoria.id,
      fase: 'semifinal',
      ronda: 1,
      pareja1_id: primeroGrupo2.pareja_id,
      pareja2_id: segundoGrupo1.pareja_id,
      cancha: sf2Slot.cancha,
      fecha: sf2Slot.fecha,
      hora_inicio: sf2Slot.hora_inicio,
      hora_fin: sf2Slot.hora_fin,
      estado: 'pendiente',
      _label: 'Semifinal 2'
    },
    {
      torneo_id: torneo.id,
      categoria_id: categoria.id,
      fase: 'final',
      ronda: 1,
      pareja1_id: null,   // se completa al terminar semis
      pareja2_id: null,
      cancha: finalSlot.cancha,
      fecha: finalSlot.fecha,
      hora_inicio: finalSlot.hora_inicio,
      hora_fin: finalSlot.hora_fin,
      estado: 'pendiente',
      _label: 'Final'
    },
    {
      torneo_id: torneo.id,
      categoria_id: categoria.id,
      fase: 'tercer_puesto',
      ronda: 1,
      pareja1_id: null,   // se completa al terminar semis
      pareja2_id: null,
      cancha: tercerSlot.cancha,
      fecha: tercerSlot.fecha,
      hora_inicio: tercerSlot.hora_inicio,
      hora_fin: tercerSlot.hora_fin,
      estado: 'pendiente',
      _label: 'Tercer puesto'
    }
  ];
}

/**
 * Recalcula la tabla de posiciones de un grupo a partir de todos sus partidos jugados.
 * Retorna array de objetos para upsert en posiciones_torneo.
 *
 * Sistema de puntos:
 *   Victoria = 2 pts, Derrota = 1 pt, Walkover ganador = 2 pts, perdedor = 0 pts
 * Desempate: 1) puntos 2) diferencia de sets 3) diferencia de games
 */
function calcularPosiciones(parejas, partidos) {
  const stats = {};

  for (const pareja of parejas) {
    stats[pareja.id] = {
      pareja_id: pareja.id,
      grupo: pareja.numero_grupo,
      partidos_jugados: 0,
      partidos_ganados: 0,
      partidos_perdidos: 0,
      sets_favor: 0,
      sets_contra: 0,
      games_favor: 0,
      games_contra: 0,
      puntos: 0
    };
  }

  for (const partido of partidos) {
    if (partido.estado !== 'jugado' && partido.estado !== 'walkover') continue;
    if (!partido.ganador_id) continue;

    const p1 = stats[partido.pareja1_id];
    const p2 = stats[partido.pareja2_id];
    if (!p1 || !p2) continue;

    const esWalkover = partido.estado === 'walkover';

    p1.partidos_jugados++;
    p2.partidos_jugados++;

    const esEmpate = !partido.ganador_id && partido.sets_pareja1 === partido.sets_pareja2;
    if (esEmpate) {
      p1.puntos += 1;
      p2.puntos += 1;
    } else if (partido.ganador_id === partido.pareja1_id) {
      p1.partidos_ganados++;
      p2.partidos_perdidos++;
      p1.puntos += 3;
      p2.puntos += esWalkover ? 0 : 0;
    } else {
      p2.partidos_ganados++;
      p1.partidos_perdidos++;
      p2.puntos += 3;
      p1.puntos += esWalkover ? 0 : 0;
    }

    p1.sets_favor += partido.sets_pareja1 || 0;
    p1.sets_contra += partido.sets_pareja2 || 0;
    p2.sets_favor += partido.sets_pareja2 || 0;
    p2.sets_contra += partido.sets_pareja1 || 0;

    p1.games_favor += partido.games_pareja1 || 0;
    p1.games_contra += partido.games_pareja2 || 0;
    p2.games_favor += partido.games_pareja2 || 0;
    p2.games_contra += partido.games_pareja1 || 0;
  }

  // Ordenar y asignar posición
  const ordenados = Object.values(stats).sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    const diffSetsA = a.sets_favor - a.sets_contra;
    const diffSetsB = b.sets_favor - b.sets_contra;
    if (diffSetsB !== diffSetsA) return diffSetsB - diffSetsA;
    const diffGamesA = a.games_favor - a.games_contra;
    const diffGamesB = b.games_favor - b.games_contra;
    return diffGamesB - diffGamesA;
  });

  ordenados.forEach((s, i) => { s.posicion = i + 1; });

  return ordenados;
}

/**
 * Parsea un resultado de tipo "6-3 6-4" o "6-3 4-6 7-5"
 * y devuelve { sets, games } para cada pareja.
 */
function parsearResultado(resultado1, resultado2, tiebreak1 = null, tiebreak2 = null) {
  if (!resultado1 || !resultado2) return null;
  const sets1 = resultado1.trim().split(' ');
  const sets2 = resultado2.trim().split(' ');
  if (sets1.length !== sets2.length) return null;
  let setsGanados1 = 0, setsGanados2 = 0;
  let totalGames1 = 0, totalGames2 = 0;
  for (let i = 0; i < sets1.length; i++) {
    const g1 = parseInt(sets1[i]);
    const g2 = parseInt(sets2[i]);
    if (isNaN(g1) || isNaN(g2)) return null;
    totalGames1 += g1;
    totalGames2 += g2;
    if (g1 > g2) setsGanados1++;
    else setsGanados2++;
  }
  let ganador = null;
  if (setsGanados1 > setsGanados2) ganador = 1;
  else if (setsGanados2 > setsGanados1) ganador = 2;
  else if (tiebreak1 !== null && tiebreak2 !== null) {
    const tb1 = parseInt(tiebreak1);
    const tb2 = parseInt(tiebreak2);
    if (!isNaN(tb1) && !isNaN(tb2)) ganador = tb1 > tb2 ? 1 : tb2 > tb1 ? 2 : null;
  }
  return {
    sets_pareja1: setsGanados1,
    sets_pareja2: setsGanados2,
    games_pareja1: totalGames1,
    games_pareja2: totalGames2,
    tiebreak_pareja1: tiebreak1 !== null ? parseInt(tiebreak1) : null,
    tiebreak_pareja2: tiebreak2 !== null ? parseInt(tiebreak2) : null,
    ganador
  };
}

// ============================================================
// HELPERS
// ============================================================

function getFechasEnRango(fechaInicio, fechaFin) {
  const fechas = [];
  const inicio = new Date(fechaInicio + 'T12:00:00');
  const fin = new Date(fechaFin + 'T12:00:00');
  const actual = new Date(inicio);

  while (actual <= fin) {
    const y=actual.getFullYear(),m=String(actual.getMonth()+1).padStart(2,'0'),d=String(actual.getDate()).padStart(2,'0'); fechas.push(`${y}-${m}-${d}`);
    actual.setDate(actual.getDate() + 1);
  }

  return fechas;
}

function minToTime(minutos) {
  const h = Math.floor(minutos / 60).toString().padStart(2, '0');
  const m = (minutos % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function rotarArray(arr, n) {
  const len = arr.length;
  const rot = n % len;
  return [...arr.slice(len - rot), ...arr.slice(0, len - rot)];
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = {
  generarFixture,
  generarBracket,
  calcularPosiciones,
  parsearResultado,
  generarSlots,        // exportado para tests
  generarRondasRoundRobin  // exportado para tests
};
