const { randomUUID } = require('crypto');

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const users = new Map();

const response = (statusCode, body) => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
});

const validate = ({ nombreCompleto, rut, fechaNacimiento }) => {
  const errors = [];
  if (typeof nombreCompleto !== 'string' || !nombreCompleto.trim()) {
    errors.push('nombreCompleto es requerido');
  }
  if (typeof rut !== 'string' || !/^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$/.test(rut.trim())) {
    errors.push('rut es requerido con formato 12.345.678-9');
  }
  if (
    typeof fechaNacimiento !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento) ||
    Number.isNaN(Date.parse(fechaNacimiento))
  ) {
    errors.push('fechaNacimiento es requerida con formato YYYY-MM-DD');
  }
  return errors;
};

const createUser = (event) => {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { message: 'JSON inválido' });
  }

  const errors = validate(body);
  if (errors.length) return response(400, { message: 'Datos inválidos', errors });

  const user = {
    idUsuario: randomUUID(),
    nombreCompleto: body.nombreCompleto.trim(),
    rut: body.rut.trim(),
    fechaNacimiento: body.fechaNacimiento,
  };
  users.set(user.idUsuario, user);

  return response(201, { message: 'Usuario creado', data: user });
};

const getUser = (idUsuario) => {
  const user = users.get(idUsuario);
  if (!user) return response(404, { message: 'Usuario no encontrado' });
  return response(200, { data: user });
};

const listUsers = () => {
  const data = [...users.values()];
  return response(200, { data, count: data.length });
};

module.exports.handler = async (event) => {
  const idUsuario = event.pathParameters && event.pathParameters.idUsuario;

  switch (event.httpMethod) {
    case 'POST':
      return createUser(event);
    case 'GET':
      return idUsuario ? getUser(idUsuario) : listUsers();
    default:
      return response(405, { message: 'Método no permitido' });
  }
};
