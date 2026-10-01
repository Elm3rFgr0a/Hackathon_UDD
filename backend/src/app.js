const express = require('express');
const { HttpError } = require('./http');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => res.json({ ok: true, servicio: 'cerca-api', hora: new Date().toISOString() }));

app.use(require('./routes/auth'));
app.use(require('./routes/demo'));
app.use(require('./routes/estado'));
app.use(require('./routes/tomas'));
app.use(require('./routes/agenda'));
app.use(require('./routes/medicamentos'));
app.use(require('./routes/personas'));
app.use(require('./routes/vistos'));
app.use(require('./routes/eleam'));

app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, ...(err.errors && { errors: err.errors }) });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON inválido' });
  console.error(err);
  return res.status(500).json({ message: 'Error interno' });
});

module.exports = app;
