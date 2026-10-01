const test = require('node:test');
const assert = require('node:assert/strict');
const { consumoDiario, stockDias, semaforo, unidadesDesdeDias } = require('./stock');

test('consumoDiario multiplica unidades por toma y horarios', () => {
  assert.equal(consumoDiario({ horarios: ['08:00', '20:00'] }), 2);
  assert.equal(consumoDiario({ unidadesPorToma: 2, horarios: ['08:00', '20:00'] }), 4);
  assert.equal(consumoDiario({ horarios: [] }), 0);
});

test('stockDias redondea hacia abajo y no baja de cero', () => {
  assert.equal(stockDias({ horarios: ['08:00', '20:00'], stockUnidades: 13 }), 6);
  assert.equal(stockDias({ horarios: ['08:00'], stockUnidades: 0 }), 0);
  assert.equal(stockDias({ horarios: ['08:00'], stockUnidades: -2 }), 0);
  assert.equal(stockDias({ horarios: [], stockUnidades: 10 }), null);
});

test('semaforo usa 3 días para rojo y el umbral para amarillo', () => {
  assert.equal(semaforo(0), 'rojo');
  assert.equal(semaforo(3), 'rojo');
  assert.equal(semaforo(4), 'amarillo');
  assert.equal(semaforo(7), 'amarillo');
  assert.equal(semaforo(8), 'verde');
  assert.equal(semaforo(10, 14), 'amarillo');
  assert.equal(semaforo(null), 'verde');
});

test('unidadesDesdeDias es el inverso de stockDias', () => {
  const med = { unidadesPorToma: 1, horarios: ['08:00', '20:00'] };
  const unidades = unidadesDesdeDias(6, med);
  assert.equal(unidades, 12);
  assert.equal(stockDias({ ...med, stockUnidades: unidades }), 6);
});
