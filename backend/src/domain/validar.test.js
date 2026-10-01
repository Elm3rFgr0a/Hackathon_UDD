const test = require('node:test');
const assert = require('node:assert/strict');
const { check } = require('./validar');

test('acepta datos válidos y normaliza', () => {
  const data = check({ id: 'm-k3j2h1a', nombre: '  Losartán ', horarios: ['20:00', '08:00'], email: 'Ana@Correo.CL', stockDias: 30 })
    .id('id').texto('nombre', { req: true }).horarios('horarios').email('email').entero('stockDias').done();
  assert.deepEqual(data, { id: 'm-k3j2h1a', nombre: 'Losartán', horarios: ['08:00', '20:00'], email: 'ana@correo.cl', stockDias: 30 });
});

test('acumula todos los errores y responde 400', () => {
  assert.throws(
    () => check({ id: 'mal id!', fecha: '01-10-2026', horarios: ['08:00', '08:00'], stockDias: -1 })
      .id('id').fecha('fecha').horarios('horarios').entero('stockDias').texto('nombre', { req: true }).done(),
    (err) => err.status === 400 && err.errors.length === 5,
  );
});

test('los campos opcionales vacíos toman su valor por defecto', () => {
  const data = check({ lugar: '' }).texto('lugar', { defecto: '' }).texto('con').instante('at', { defecto: 'X' }).done();
  assert.deepEqual(data, { lugar: '', at: 'X' });
});

test('acepta los ids del seed, del cliente y derivados', () => {
  for (const id of ['e-rosa', 'u-k3j2h1a', 'cerca-n-yoga-e-rosa']) assert.ok(check({ id }).id('id').done());
  for (const id of ['', 'a', 'con espacio', 'x#y', 'a'.repeat(81)]) {
    assert.throws(() => check({ id }).id('id').done());
  }
});

test('opcion e ids rechazan valores fuera de lo permitido', () => {
  assert.throws(() => check({ value: 'quizas' }).opcion('value', ['asistio', 'no']).done());
  assert.throws(() => check({ ids: ['e-rosa', 'e-rosa'] }).ids('ids').done());
  assert.throws(() => check({ ids: [] }).ids('ids').done());
});
