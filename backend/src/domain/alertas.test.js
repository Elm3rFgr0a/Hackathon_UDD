const test = require('node:test');
const assert = require('node:assert/strict');
const { cruceDeUmbral, alertaStock, alertaOmision, destinatarios } = require('./alertas');

const med = { nombre: 'Losartán', dosis: '50 mg', horarios: ['13:00'], unidadesPorToma: 1, umbralDias: 7, responsableId: 'u-jorge' };

test('avisa solo cuando el semáforo empeora', () => {
  assert.equal(cruceDeUmbral(med, 9, 8), null); // verde → verde
  assert.equal(cruceDeUmbral(med, 8, 7), 'amarillo'); // cruza el umbral de 7 días
  assert.equal(cruceDeUmbral(med, 7, 6), null); // sigue en amarillo
  assert.equal(cruceDeUmbral(med, 4, 3), 'rojo'); // cruza a crítico
  assert.equal(cruceDeUmbral(med, 3, 2), null);
  assert.equal(cruceDeUmbral(med, 2, 9), null); // una compra no avisa
});

test('el texto de stock dice cuánto queda y quién compra', () => {
  const a = alertaStock({ med, persona: { nombre: 'Rosa' }, responsable: { nombre: 'Jorge' }, unidades: 3 });
  assert.equal(a.nivel, 'rojo');
  assert.equal(a.titulo, 'A Losartán de Rosa le quedan 3 días');
  assert.match(a.mensaje, /\(stock crítico\)\. Compra a cargo de Jorge\.$/);
  assert.equal(alertaStock({ med, persona: { nombre: 'Rosa' }, unidades: 1 }).titulo, 'A Losartán de Rosa le queda 1 día');
});

test('el texto de una dosis no dada incluye el motivo y el establecimiento', () => {
  const a = alertaOmision({ med, persona: { nombre: 'Héctor' }, hora: '13:00', motivo: 'rechazo', establecimiento: { nombre: 'ELEAM Los Aromos' } });
  assert.equal(a.titulo, 'Héctor no recibió Losartán de las 13:00');
  assert.match(a.mensaje, /en ELEAM Los Aromos\. Motivo: Rechazó el remedio\.$/);
});

test('reciben la alerta el responsable y los administradores, activos y con teléfono', () => {
  const miembros = [
    { id: 'u-camila', permiso: 'admin', estado: 'activo', telefono: '+569111' },
    { id: 'u-jorge', permiso: 'edita', estado: 'activo', telefono: '+569222' },
    { id: 'u-marta', permiso: 've', estado: 'activo', telefono: '+569333' },
    { id: 'u-nuevo', permiso: 'admin', estado: 'invitado', telefono: '+569444' },
    { id: 'u-sin', permiso: 'admin', estado: 'activo' },
  ];
  assert.deepEqual(destinatarios(miembros, med).map((m) => m.id), ['u-camila', 'u-jorge']);
});
