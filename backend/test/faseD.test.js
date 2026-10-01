// Fase D por HTTP: ronda ELEAM con excepciones, alertas de stock, "ya compré",
// establecimiento de las personas y teléfono de los miembros.

const test = require('node:test');
const assert = require('node:assert/strict');
const { levantar } = require('./servidor');

// 1 de octubre de 2026, 12:35 en Chile: la ronda de las 12:30 está pendiente.
const NOW = '2026-10-01T15:35:00.000Z';
const FECHA = '2026-10-01';

let s;
let tok;

test.before(async () => {
  s = await levantar();
  const r = await s.api('POST', '/demo/reset', { now: NOW });
  assert.equal(r.status, 200);
  tok = {
    camila: await s.login('camila@cerca.cl'),
    marta: await s.login('marta@cerca.cl'),
    rosa: await s.login('rosa@cerca.cl'),
    paula: await s.login('cuidadora@losaromos.cl'),
  };
});
test.after(() => s.cerrar());

test('el personal del ELEAM inicia sesión con su establecimiento y no entra a los grupos', async () => {
  const r = await s.api('POST', '/auth/login', { email: 'cuidadora@losaromos.cl', password: '1234' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.sesion, { rol: 'eleam', personId: 's-paula', selectedElderId: null, permiso: null, establecimientoId: 'est-los-aromos' });

  assert.equal((await s.api('GET', '/estado', undefined, tok.paula)).status, 403);
  assert.equal((await s.api('PUT', '/tomas', { medId: 'm-losartan', fecha: FECHA, hora: '13:00' }, tok.paula)).status, 403);
  assert.equal((await s.api('GET', '/eleam/ronda', undefined, tok.camila)).status, 403);
  assert.equal((await s.api('GET', '/eleam/ronda', undefined, tok.rosa)).status, 403);
});

test('la ronda reúne a los residentes de distintas familias, sin datos de contacto', async () => {
  const r = await s.api('GET', `/eleam/ronda?fecha=${FECHA}`, undefined, tok.paula);
  assert.equal(r.status, 200);
  assert.equal(r.body.establecimiento.nombre, 'ELEAM Los Aromos');
  assert.equal(r.body.personal.nombre, 'Paula');
  assert.deepEqual(r.body.residentes.map((p) => p.nombre), ['Héctor', 'Luis', 'Elena']); // por apellido
  assert.ok(r.body.residentes.every((p) => !('telefono' in p) && !('grupoId' in p)));
  assert.deepEqual(r.body.horas, ['07:00', '08:00', '12:30', '20:00']);

  const de = (medId, hora) => r.body.dosis.find((d) => d.medId === medId && d.hora === hora);
  assert.equal(de('m-levotiroxina', '07:00').estado, 'dada'); // ya pasó y el seed la registró
  assert.equal(de('m-omeprazol', '12:30').estado, 'pendiente');
  assert.equal(de('m-calcio-luis', '12:30').semaforo, 'rojo');
  assert.ok(!r.body.dosis.some((d) => d.medId === 'm-losartan'), 'Rosa vive en casa: no está en la ronda');
});

test('marcar la ronda da todas las dosis salvo las excepciones, y avisa a cada familia', async () => {
  const antes = s.notifier.enviados.length;
  const r = await s.api('POST', '/eleam/ronda/marcar', {
    fecha: FECHA, hora: '12:30', at: NOW, excepciones: [{ medId: 'm-calcio-luis', motivo: 'rechazo' }],
  }, tok.paula);
  assert.equal(r.status, 200);
  // Héctor y Elena reciben su dosis; Luis la rechazó.
  // Alertas: omeprazol de Héctor cruza a rojo, paracetamol de Elena cruza a amarillo, y la dosis no dada de Luis.
  assert.deepEqual({ dadas: r.body.dadas, omitidas: r.body.omitidas, yaRegistradas: r.body.yaRegistradas, alertas: r.body.alertas },
    { dadas: 2, omitidas: 1, yaRegistradas: 0, alertas: 3 });

  const mensajes = s.notifier.enviados.slice(antes);
  // Omeprazol de Héctor: a Marta (responsable) y Camila (admin). Elena: Andrea. Luis: Pedro.
  assert.equal(mensajes.length, 4);
  assert.ok(mensajes.some((m) => m.to === '+56900000003' && /Omeprazol 20 mg de Héctor le quedan 3 días \(stock crítico\)/.test(m.body)));
  assert.ok(mensajes.some((m) => m.to === '+56900000005' && /Luis no recibió Carbonato de calcio/.test(m.body) && /Rechazó/.test(m.body)));

  const ronda = await s.api('GET', `/eleam/ronda?fecha=${FECHA}`, undefined, tok.paula);
  const calcio = ronda.body.dosis.find((d) => d.medId === 'm-calcio-luis');
  assert.equal(calcio.estado, 'omitida');
  assert.equal(calcio.motivoTexto, 'Rechazó el remedio');
  assert.equal(ronda.body.dosis.find((d) => d.medId === 'm-omeprazol' && d.hora === '12:30').stockDias, 3);

  // Repetirla no duplica tomas, descuentos ni avisos.
  const otra = await s.api('POST', '/eleam/ronda/marcar', { fecha: FECHA, hora: '12:30', at: NOW }, tok.paula);
  assert.deepEqual([otra.body.dadas, otra.body.omitidas, otra.body.yaRegistradas], [0, 0, 3]);
  assert.equal(s.notifier.enviados.length, antes + 4);
});

test('la ronda rechaza excepciones de otra hora o con motivo desconocido', async () => {
  const r1 = await s.api('POST', '/eleam/ronda/marcar', { fecha: FECHA, hora: '20:00', excepciones: [{ medId: 'm-calcio-luis', motivo: 'rechazo' }] }, tok.paula);
  assert.equal(r1.status, 400);
  const r2 = await s.api('POST', '/eleam/ronda/marcar', { fecha: FECHA, hora: '20:00', excepciones: [{ medId: 'm-donepecilo-luis', motivo: 'porque si' }] }, tok.paula);
  assert.equal(r2.status, 400);
});

test('la familia ve en /estado la toma del ELEAM y la alerta enviada; la persona mayor no ve alertas', async () => {
  const e = (await s.api('GET', '/estado', undefined, tok.camila)).body;
  assert.ok(e.intakes[`m-omeprazol|${FECHA}|12:30`]);
  assert.equal(e.medications.find((m) => m.id === 'm-omeprazol').semaforo, 'rojo');
  const alerta = e.alertas.find((a) => a.medId === 'm-omeprazol' && a.nivel === 'rojo');
  assert.ok(alerta);
  assert.equal(alerta.estado, 'simulada');
  assert.deepEqual(alerta.destinatarios.sort(), ['Camila', 'Marta']);
  assert.ok(e.alertas.length >= 3); // más las dos del seed
  assert.equal(e.members.find((m) => m.id === 'u-camila').telefono, '+56900000001');

  const rosa = (await s.api('GET', '/estado', undefined, tok.rosa)).body;
  assert.deepEqual(rosa.alertas, []);
  assert.ok(rosa.members.every((m) => m.telefono === undefined));

  // La dosis no dada de Luis quedó en el grupo de su familia, no en el de Camila.
  assert.ok(s.db.get({ PK: 'GRUPO#g-rojas', SK: `OMISION#${FECHA}#12:30#m-calcio-luis` }));
  assert.deepEqual(e.omissions, {});
});

test('una toma que cruza el umbral responde con la alerta', async () => {
  await s.api('POST', '/medicamentos', {
    id: 'm-vitamina', elderId: 'e-rosa', nombre: 'Vitamina D', dosis: '1000 UI', horarios: ['13:00'], stockDias: 8, responsableId: 'u-jorge',
  }, tok.camila);
  const r = await s.api('PUT', '/tomas', { medId: 'm-vitamina', fecha: FECHA, hora: '13:00', at: NOW }, tok.rosa);
  assert.equal(r.status, 201);
  assert.equal(r.body.stockDias, 7);
  assert.equal(r.body.semaforo, 'amarillo');
  assert.equal(r.body.alerta.estado, 'simulada');
});

test('ya compré: suma unidades, deja el movimiento y exige permiso de edición', async () => {
  const r = await s.api('POST', '/medicamentos/m-metformina/compras', { unidades: 30 }, tok.camila);
  assert.equal(r.status, 201);
  assert.deepEqual([r.body.stockUnidades, r.body.stockDias, r.body.semaforo], [36, 36, 'verde']);
  const movs = s.db.query({ KeyConditionExpression: 'PK = :pk AND begins_with(SK, :p)', ExpressionAttributeValues: { ':pk': 'GRUPO#g-munoz', ':p': 'MOV#' } });
  assert.ok(movs.some((m) => m.medId === 'm-metformina' && m.tipo === 'COMPRA' && m.unidades === 30));

  assert.equal((await s.api('POST', '/medicamentos/m-metformina/compras', { unidades: 30 }, tok.marta)).status, 403);
  assert.equal((await s.api('POST', '/medicamentos/m-metformina/compras', { unidades: 30 }, tok.rosa)).status, 403);
  assert.equal((await s.api('POST', '/medicamentos/m-metformina/compras', { unidades: 0 }, tok.camila)).status, 400);
  assert.equal((await s.api('POST', '/medicamentos/no-existe/compras', { unidades: 5 }, tok.camila)).status, 404);
});

test('la residencia define el establecimiento: entrar y salir de la ronda', async () => {
  const ronda = async () => (await s.api('GET', `/eleam/ronda?fecha=${FECHA}`, undefined, tok.paula)).body;
  const persona = { id: 'e-olga', nombre: 'Olga', apellido: 'Díaz', fechaNacimiento: '1942-02-02', residencia: 'ELEAM Los Aromos' };
  assert.equal((await s.api('POST', '/personas', persona, tok.camila)).status, 201);
  await s.api('POST', '/medicamentos', { id: 'm-olga', elderId: 'e-olga', nombre: 'Aspirina', dosis: '100 mg', horarios: ['09:00'], stockDias: 20 }, tok.camila);

  let r = await ronda();
  assert.ok(r.residentes.some((p) => p.id === 'e-olga'));
  assert.ok(r.dosis.some((d) => d.medId === 'm-olga'));

  assert.equal((await s.api('PUT', '/personas/e-olga', { ...persona, residencia: 'Vive con familia' }, tok.camila)).status, 200);
  r = await ronda();
  assert.ok(!r.residentes.some((p) => p.id === 'e-olga'));
  assert.ok(!r.dosis.some((d) => d.medId === 'm-olga'));
  assert.equal(s.db.get({ PK: 'GRUPO#g-munoz', SK: 'MED#m-olga' }).GSI1PK, undefined);
});

test('invitar un miembro normaliza su teléfono para WhatsApp', async () => {
  const ok = await s.api('POST', '/miembros', { id: 'u-tia', nombre: 'Rita', email: 'rita@ejemplo.cl', telefono: '9 8765 4321', permiso: 've' }, tok.camila);
  assert.equal(ok.status, 201);
  assert.equal(s.db.get({ PK: 'GRUPO#g-munoz', SK: 'MIEMBRO#u-tia' }).telefono, '+56987654321');
  const mal = await s.api('POST', '/miembros', { id: 'u-tia2', nombre: 'Rita', email: 'rita2@ejemplo.cl', telefono: '123', permiso: 've' }, tok.camila);
  assert.equal(mal.status, 400);
});
