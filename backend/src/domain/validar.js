// Validación de los datos que llegan en el body. Acumula todos los errores y
// responde 400 con la lista, para que el front pueda mostrar qué falta.

const { HttpError } = require('../http');
const { isISODate, isHHMM } = require('./time');

// Ids generados por el cliente (`m-k3j2h1a`), del seed (`e-rosa`) o derivados (`cerca-n-yoga-e-rosa`).
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const vacio = (v) => v === undefined || v === null || v === '';

class Check {
  constructor(body) {
    this.body = body && typeof body === 'object' ? body : {};
    this.errors = [];
    this.data = {};
  }

  campo(k, { req, test, msg, map = (x) => x, defecto }) {
    const v = this.body[k];
    if (vacio(v)) {
      if (req) this.errors.push(`${k} es requerido`);
      else if (defecto !== undefined) this.data[k] = defecto;
      return this;
    }
    if (!test(v)) this.errors.push(`${k} ${msg}`);
    else this.data[k] = map(v);
    return this;
  }

  id(k, { req = true } = {}) {
    return this.campo(k, { req, test: (v) => typeof v === 'string' && ID_RE.test(v), msg: 'no es un id válido' });
  }

  texto(k, { req = false, max = 200, defecto } = {}) {
    return this.campo(k, {
      req, defecto,
      test: (v) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max,
      msg: `debe ser un texto de hasta ${max} caracteres`,
      map: (v) => v.trim(),
    });
  }

  fecha(k, { req = true } = {}) {
    return this.campo(k, { req, test: isISODate, msg: 'debe tener formato YYYY-MM-DD' });
  }

  hora(k, { req = true } = {}) {
    return this.campo(k, { req, test: isHHMM, msg: 'debe tener formato HH:mm' });
  }

  /** Instante ISO. Si no viene, usa `defecto` (por ejemplo, la hora del servidor). */
  instante(k, { defecto } = {}) {
    return this.campo(k, {
      req: false, defecto,
      test: (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v)),
      msg: 'debe ser una fecha ISO',
      map: (v) => new Date(v).toISOString(),
    });
  }

  opcion(k, valores, { req = true, defecto } = {}) {
    return this.campo(k, { req, defecto, test: (v) => valores.includes(v), msg: `debe ser uno de: ${valores.join(', ')}` });
  }

  entero(k, { req = true, min = 0, max = 100000 } = {}) {
    return this.campo(k, {
      req,
      test: (v) => Number.isInteger(v) && v >= min && v <= max,
      msg: `debe ser un número entero entre ${min} y ${max}`,
    });
  }

  email(k, { req = true } = {}) {
    return this.campo(k, {
      req,
      test: (v) => typeof v === 'string' && v.length <= 200 && EMAIL_RE.test(v.trim()),
      msg: 'no es un correo válido',
      map: (v) => v.trim().toLowerCase(),
    });
  }

  /**
   * Teléfono para WhatsApp, normalizado a formato internacional (+569…).
   * Acepta espacios, guiones y paréntesis; un celular chileno de 9 dígitos recibe +56.
   */
  telefono(k, { req = false } = {}) {
    const normalizar = (v) => {
      const limpio = String(v).replace(/[\s()-]/g, '');
      return /^9\d{8}$/.test(limpio) ? `+56${limpio}` : limpio;
    };
    return this.campo(k, {
      req,
      test: (v) => typeof v === 'string' && /^\+\d{8,15}$/.test(normalizar(v)),
      msg: 'debe ser un teléfono como +56 9 1234 5678',
      map: normalizar,
    });
  }

  /** Lista de ids sin repetir. */
  ids(k, { min = 1, max = 20 } = {}) {
    return this.campo(k, {
      req: min > 0,
      test: (v) => Array.isArray(v) && v.length >= min && v.length <= max
        && v.every((x) => typeof x === 'string' && ID_RE.test(x)) && new Set(v).size === v.length,
      msg: `debe ser una lista de ${min} a ${max} ids distintos`,
    });
  }

  /** Lista de horarios HH:mm sin repetir, ordenada. */
  horarios(k) {
    return this.campo(k, {
      req: true,
      test: (v) => Array.isArray(v) && v.length >= 1 && v.length <= 8 && v.every(isHHMM) && new Set(v).size === v.length,
      msg: 'debe ser una lista de 1 a 8 horarios HH:mm distintos',
      map: (v) => [...v].sort(),
    });
  }

  /** Lanza 400 con todos los errores, o devuelve los datos validados. */
  done() {
    if (this.errors.length) throw new HttpError(400, 'Datos inválidos', this.errors);
    return this.data;
  }
}

const check = (body) => new Check(body);

module.exports = { check, ID_RE };
