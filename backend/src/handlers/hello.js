module.exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: '¡Hola! Welcome to Hackathon Backend',
      timestamp: new Date().toISOString(),
    }),
  };
};
