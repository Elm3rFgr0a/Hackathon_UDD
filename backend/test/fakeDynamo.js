// DynamoDB en memoria para las pruebas de punta a punta (sin AWS ni Docker).
// Implementa solo las operaciones y expresiones que usa src/db/repo.js; si el
// código empieza a usar otra, este archivo lanza un error explícito.

const clone = (x) => (x === undefined ? undefined : structuredClone(x));

class ConditionalCheckFailed extends Error {
  constructor() {
    super('The conditional request failed');
    this.name = 'ConditionalCheckFailedException';
  }
}

class TransactionCanceled extends Error {
  constructor(codes) {
    super('Transaction cancelled');
    this.name = 'TransactionCanceledException';
    this.CancellationReasons = codes.map((Code) => ({ Code }));
  }
}

const INDICES = { GSI1: { pk: 'GSI1PK', sk: 'GSI1SK' } };

/** Resuelve `#nombre` y `:valor`. */
const ctx = (input) => ({
  name: (n) => (n.startsWith('#') ? input.ExpressionAttributeNames[n] : n),
  value: (v) => {
    if (!(v in (input.ExpressionAttributeValues ?? {}))) throw new Error(`fakeDynamo: valor sin definir ${v}`);
    return input.ExpressionAttributeValues[v];
  },
});

function cumple(expr, item, input) {
  if (!expr) return true;
  const c = ctx(input);
  return expr.split(/\s+AND\s+/i).every((parte) => {
    let m = /^attribute_not_exists\((\S+)\)$/.exec(parte.trim());
    if (m) return item === undefined || item[c.name(m[1])] === undefined;
    m = /^attribute_exists\((\S+)\)$/.exec(parte.trim());
    if (m) return item !== undefined && item[c.name(m[1])] !== undefined;
    m = /^(\S+)\s*(>=|<=|<>|=|>|<)\s*(:\w+)$/.exec(parte.trim());
    if (m) {
      if (!item) return false;
      const a = item[c.name(m[1])];
      const b = c.value(m[3]);
      return { '>=': a >= b, '<=': a <= b, '<>': a !== b, '=': a === b, '>': a > b, '<': a < b }[m[2]];
    }
    throw new Error(`fakeDynamo: condición no soportada "${parte}"`);
  });
}

function aplicarUpdate(expr, item, input) {
  const c = ctx(input);
  const out = { ...item };
  const sets = /SET\s+(.+?)(?=\s+REMOVE\s|$)/i.exec(expr)?.[1];
  const removes = /REMOVE\s+(.+?)(?=\s+SET\s|$)/i.exec(expr)?.[1];
  for (const asig of sets ? sets.split(/\s*,\s*/) : []) {
    const m = /^(\S+)\s*=\s*(?:(\S+)\s*([+-])\s*(:\w+)|(:\w+))$/.exec(asig.trim());
    if (!m) throw new Error(`fakeDynamo: SET no soportado "${asig}"`);
    const campo = c.name(m[1]);
    if (m[5]) out[campo] = clone(c.value(m[5]));
    else {
      const base = out[c.name(m[2])];
      if (typeof base !== 'number') throw new Error(`fakeDynamo: ${m[2]} no es número`);
      out[campo] = m[3] === '+' ? base + c.value(m[4]) : base - c.value(m[4]);
    }
  }
  for (const r of removes ? removes.split(/\s*,\s*/) : []) delete out[c.name(r.trim())];
  return out;
}

class FakeDynamo {
  constructor() {
    this.items = new Map();
    this.llamadas = [];
  }

  static k({ PK, SK }) {
    return `${PK}\u0000${SK}`;
  }

  get(key) {
    return this.items.get(FakeDynamo.k(key));
  }

  put(item) {
    // Igual que DynamoDB: los atributos clave de un índice deben ser texto si existen.
    for (const { pk, sk } of Object.values(INDICES)) {
      for (const a of [pk, sk]) {
        if (a in item && typeof item[a] !== 'string') throw new Error(`fakeDynamo: ${a} debe ser texto`);
      }
    }
    this.items.set(FakeDynamo.k(item), clone(item));
  }

  async send(cmd) {
    const op = cmd.constructor.name.replace(/Command$/, '');
    const input = cmd.input;
    this.llamadas.push(op);
    switch (op) {
      case 'Get':
        return { Item: clone(this.get(input.Key)) };
      case 'Put': {
        if (!cumple(input.ConditionExpression, this.get(input.Item), input)) throw new ConditionalCheckFailed();
        this.put(input.Item);
        return {};
      }
      case 'Delete': {
        if (!cumple(input.ConditionExpression, this.get(input.Key), input)) throw new ConditionalCheckFailed();
        this.items.delete(FakeDynamo.k(input.Key));
        return {};
      }
      case 'Update': {
        const actual = this.get(input.Key);
        if (!cumple(input.ConditionExpression, actual, input)) throw new ConditionalCheckFailed();
        const nuevo = aplicarUpdate(input.UpdateExpression, actual ?? { ...input.Key }, input);
        this.put(nuevo);
        return { Attributes: clone(nuevo) };
      }
      case 'Query':
        return { Items: this.query(input) };
      case 'BatchWrite': {
        for (const reqs of Object.values(input.RequestItems)) {
          for (const r of reqs) {
            if (r.PutRequest) this.put(r.PutRequest.Item);
            else this.items.delete(FakeDynamo.k(r.DeleteRequest.Key));
          }
        }
        return { UnprocessedItems: {} };
      }
      case 'TransactWrite':
        return this.transact(input.TransactItems);
      default:
        throw new Error(`fakeDynamo: operación no soportada ${op}`);
    }
  }

  query(input) {
    const c = ctx(input);
    const idx = input.IndexName ? INDICES[input.IndexName] : { pk: 'PK', sk: 'SK' };
    if (!idx) throw new Error(`fakeDynamo: índice desconocido ${input.IndexName}`);
    const [cond, ...resto] = input.KeyConditionExpression.split(/\s+AND\s+(?![^(]*\))/i);
    const pk = /^(\S+)\s*=\s*(:\w+)$/.exec(cond.trim());
    if (!pk || c.name(pk[1]) !== idx.pk) throw new Error(`fakeDynamo: KeyCondition no soportada "${input.KeyConditionExpression}"`);
    const pkValor = c.value(pk[2]);

    let filtroSk = () => true;
    const skExpr = resto.join(' AND ').trim();
    if (skExpr) {
      let m = /^begins_with\((\S+),\s*(:\w+)\)$/.exec(skExpr);
      if (m) {
        const p = c.value(m[2]);
        filtroSk = (sk) => sk.startsWith(p);
      } else if ((m = /^(\S+)\s+BETWEEN\s+(:\w+)\s+AND\s+(:\w+)$/i.exec(skExpr))) {
        const [a, b] = [c.value(m[2]), c.value(m[3])];
        filtroSk = (sk) => sk >= a && sk <= b;
      } else throw new Error(`fakeDynamo: condición de orden no soportada "${skExpr}"`);
    }

    return [...this.items.values()]
      .filter((i) => i[idx.pk] === pkValor && typeof i[idx.sk] === 'string' && filtroSk(i[idx.sk]))
      .sort((a, b) => (a[idx.sk] < b[idx.sk] ? -1 : a[idx.sk] > b[idx.sk] ? 1 : 0))
      .map(clone);
  }

  transact(ops) {
    // Primero se evalúan todas las condiciones; si alguna falla, no se aplica nada.
    const codes = ops.map((op) => {
      const [tipo, p] = Object.entries(op)[0];
      const key = tipo === 'Put' ? p.Item : p.Key;
      return cumple(p.ConditionExpression, this.get(key), p) ? 'None' : 'ConditionalCheckFailed';
    });
    if (codes.some((x) => x !== 'None')) throw new TransactionCanceled(codes);
    for (const op of ops) {
      const [tipo, p] = Object.entries(op)[0];
      if (tipo === 'Put') this.put(p.Item);
      else if (tipo === 'Delete') this.items.delete(FakeDynamo.k(p.Key));
      else if (tipo === 'Update') this.put(aplicarUpdate(p.UpdateExpression, this.get(p.Key), p));
      else throw new Error(`fakeDynamo: ${tipo} no soportado en transacciones`);
    }
    return {};
  }
}

module.exports = { FakeDynamo };
