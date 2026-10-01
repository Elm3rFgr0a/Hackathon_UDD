const test = require('node:test');
const assert = require('node:assert/strict');
const { construirEstado } = require('./estado');
const { buildSeedItems } = require('../seed/seed');

// 1 de octubre de 2026, 12:35 en Chile (la hora del diseño).
const NOW = new Date('2026-10-01T15:35:00Z');

// GET /estado consulta solo la partición del grupo del token.
const partir = (items) => ({
  grupo: items.filter((i) => i.PK === 'GRUPO#g-munoz'),
  cerca: items.filter((i) => i.PK === 'CERCA'),
});

test('el familiar ve a todo el núcleo con la forma del seed del front', async () => {
  const { grupo, cerca } = partir(await buildSeedItems(NOW));
  const s = construirEstado(grupo, cerca, { personaId: 'u-camila', rol: 'familiar', grupoId: 'g-munoz' });

  assert.deepEqual(s.elders.map((e) => e.id).sort(), ['e-hector', 'e-rosa']);
  assert.equal(s.members.length, 3);
  assert.equal(s.members.find((m) => m.id === 'u-camila').permiso, 'admin');
  assert.equal(s.medications.length, 5);
  assert.equal(s.nearby.length, 3);

  const metformina = s.medications.find((m) => m.id === 'm-metformina');
  assert.equal(metformina.elderId, 'e-rosa');
  assert.equal(metformina.stockDias, 6);
  assert.equal(metformina.semaforo, 'amarillo');

  assert.ok(s.elders.every((e) => !('rut' in e)), 'no se expone RUT');

  const almuerzo = s.activities.find((a) => a.id === 'a-almuerzo');
  assert.deepEqual(almuerzo.elderIds, ['e-rosa', 'e-hector']);
  assert.equal(almuerzo.PK, undefined);
});

test('a las 12:35 están tomadas las dosis de ayer y las de hoy de más de 90 min', async () => {
  const { grupo, cerca } = partir(await buildSeedItems(NOW));
  const s = construirEstado(grupo, cerca, { personaId: 'u-camila', rol: 'familiar', grupoId: 'g-munoz' });

  assert.ok(s.intakes['m-metformina|2026-09-30|08:00']);
  assert.ok(s.intakes['m-metformina|2026-10-01|08:00']); // 08:00 pasó hace 4 h 35 min
  assert.equal(s.intakes['m-losartan|2026-10-01|13:00'], undefined); // todavía no
  assert.equal(s.intakes['m-omeprazol|2026-10-01|12:30'], undefined); // pasó hace 5 min
  // La gimnasia de las 08:30 empezó hace más de 3 h: ya tiene asistencia.
  assert.equal(s.attendance['a-gimnasia|e-rosa'].value, 'asistio');
  assert.equal(s.attendance['a-caminata|e-rosa'], undefined); // 10:30, hace 2 h 5 min
});

test('el adulto mayor recibe solo lo suyo y sin datos de contacto de la familia', async () => {
  const { grupo, cerca } = partir(await buildSeedItems(NOW));
  const s = construirEstado(grupo, cerca, { personaId: 'e-rosa', rol: 'adulto', grupoId: 'g-munoz' });

  assert.deepEqual(s.elders.map((e) => e.id), ['e-rosa']);
  assert.ok(s.medications.every((m) => m.elderId === 'e-rosa'));
  assert.ok(s.activities.every((a) => a.elderIds.includes('e-rosa')));
  assert.ok(Object.keys(s.intakes).every((k) => !k.startsWith('m-omeprazol') && !k.startsWith('m-levotiroxina')));
  assert.ok(s.members.every((m) => m.email === undefined && m.permiso === undefined));
  // El almuerzo es compartido con Héctor: Rosa lo ve, pero no ve datos de Héctor.
  assert.ok(s.activities.some((a) => a.id === 'a-almuerzo'));
  assert.ok(!s.activities.some((a) => a.id === 'a-musica'));
});

test('el estado incluye el reloj de demo guardado en el reset', async () => {
  const items = await buildSeedItems(NOW, { relojOffsetMs: -5400000, reseteadoEn: '2026-10-01T17:05:00.000Z' });
  const { grupo, cerca } = partir(items);
  const s = construirEstado(grupo, cerca, { personaId: 'e-rosa', rol: 'adulto', grupoId: 'g-munoz' });
  assert.deepEqual(s.reloj, { offsetMs: -5400000, desde: '2026-10-01T17:05:00.000Z' });
});

test('cada quien recibe solo sus avisos vistos', () => {
  const items = [
    { PK: 'GRUPO#g', SK: 'VISTO#u-camila#x', entidad: 'VISTO', viewerId: 'u-camila', avisoId: 'x' },
    { PK: 'GRUPO#g', SK: 'VISTO#u-jorge#y', entidad: 'VISTO', viewerId: 'u-jorge', avisoId: 'y' },
  ];
  const s = construirEstado(items, [], { personaId: 'u-camila', rol: 'familiar', grupoId: 'g' });
  assert.deepEqual(s.seen, { 'u-camila|x': true });
});
