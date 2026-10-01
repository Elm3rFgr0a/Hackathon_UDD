// Punto de entrada de la Lambda: una sola función atiende todas las rutas.
const serverless = require('serverless-http');
const app = require('./app');

module.exports.handler = serverless(app);
