const users = [
  { id: 1, name: 'Juan', email: 'juan@example.com' },
  { id: 2, name: 'María', email: 'maria@example.com' },
];

module.exports.handler = async (event) => {
  const method = event.httpMethod;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (method === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: users,
        count: users.length,
      }),
    };
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const newUser = {
      id: users.length + 1,
      name: body.name,
      email: body.email,
    };
    users.push(newUser);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Usuario creado',
        data: newUser,
      }),
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ message: 'Método no permitido' }),
  };
};
