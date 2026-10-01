const test = require('node:test');
const assert = require('node:assert/strict');
const { isISODate, isHHMM, localParts, tzOffsetMs, addDaysISO, localToInstant } = require('./time');

test('validadores de fecha y hora', () => {
  assert.ok(isISODate('2026-10-01'));
  assert.ok(!isISODate('2026-13-01'));
  assert.ok(!isISODate('01-10-2026'));
  assert.ok(isHHMM('08:00'));
  assert.ok(isHHMM('23:59'));
  assert.ok(!isHHMM('24:00'));
  assert.ok(!isHHMM('8:00'));
});

test('localParts usa la hora de Chile y no la del servidor', () => {
  // 1 de octubre de 2026, 15:35 UTC = 12:35 en Chile (UTC-3, horario de verano).
  const instante = new Date('2026-10-01T15:35:00Z');
  assert.deepEqual(localParts(instante, 'America/Santiago'), { fecha: '2026-10-01', hora: '12:35', segundo: '00' });
  // 02:00 UTC del día 2 todavía es el día 1 en Chile.
  assert.equal(localParts(new Date('2026-10-02T02:00:00Z'), 'America/Santiago').fecha, '2026-10-01');
});

test('tzOffsetMs y localToInstant son consistentes', () => {
  const instante = new Date('2026-10-01T15:35:00Z');
  const offset = tzOffsetMs(instante, 'America/Santiago');
  assert.equal(offset, -3 * 60 * 60 * 1000);
  assert.equal(localToInstant('2026-10-01', '12:35', offset).toISOString(), '2026-10-01T15:35:00.000Z');
});

test('addDaysISO cruza meses y años', () => {
  assert.equal(addDaysISO('2026-10-01', -1), '2026-09-30');
  assert.equal(addDaysISO('2026-12-31', 1), '2027-01-01');
});
