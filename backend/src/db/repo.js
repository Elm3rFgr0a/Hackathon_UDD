// Operaciones genéricas sobre la tabla. Las rutas no hablan con DynamoDB
// directamente: pasan por aquí.

const {
  GetCommand, QueryCommand, BatchWriteCommand, PutCommand, UpdateCommand, DeleteCommand, TransactWriteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { doc, TABLE } = require('./client');
const { keys } = require('./keys');

/** True si DynamoDB rechazó la escritura por una condición (registro ya existe / no existe). */
const isConditionFailed = (err) => err?.name === 'ConditionalCheckFailedException';

/** Motivos de cancelación de una transacción, en el mismo orden que sus operaciones. */
const cancellationCodes = (err) =>
  err?.name === 'TransactionCanceledException' ? (err.CancellationReasons ?? []).map((r) => r.Code) : null;

/** Put. Con `ifNotExists`, falla con ConditionalCheckFailedException si ya existe. */
async function putItem(item, { ifNotExists = false } = {}) {
  await doc.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ...(ifNotExists && { ConditionExpression: 'attribute_not_exists(PK)' }),
  }));
}

/**
 * Actualiza los campos dados de un registro que debe existir. Los campos con
 * valor `undefined` se eliminan del registro. Devuelve el registro actualizado.
 */
async function updateFields(key, fields) {
  const names = {};
  const values = {};
  const sets = [];
  const removes = [];
  Object.entries(fields).forEach(([k, v], i) => {
    names[`#f${i}`] = k;
    if (v === undefined) removes.push(`#f${i}`);
    else {
      values[`:v${i}`] = v;
      sets.push(`#f${i} = :v${i}`);
    }
  });
  const expr = [sets.length && `SET ${sets.join(', ')}`, removes.length && `REMOVE ${removes.join(', ')}`].filter(Boolean).join(' ');
  const res = await doc.send(new UpdateCommand({
    TableName: TABLE,
    Key: key,
    UpdateExpression: expr,
    ConditionExpression: 'attribute_exists(PK)',
    ExpressionAttributeNames: names,
    ...(sets.length && { ExpressionAttributeValues: values }),
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes;
}

async function deleteItem(key) {
  await doc.send(new DeleteCommand({ TableName: TABLE, Key: key }));
}

/** TransactWrite con operaciones ya armadas ({ Put }, { Update }, { Delete }); agrega TableName. */
async function transact(ops) {
  const TransactItems = ops.map((op) => {
    const [tipo, params] = Object.entries(op)[0];
    return { [tipo]: { TableName: TABLE, ...params } };
  });
  await doc.send(new TransactWriteCommand({ TransactItems }));
}

const BATCH_SIZE = 25; // máximo de DynamoDB por BatchWrite
const MAX_REINTENTOS = 5;

async function getItem(key) {
  const res = await doc.send(new GetCommand({ TableName: TABLE, Key: key }));
  return res.Item ?? null;
}

const getCuenta = (email) => getItem(keys.cuenta(email));

/** Todos los registros de una partición, recorriendo todas las páginas. */
async function queryPartition(pk) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await doc.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': pk },
      ExclusiveStartKey,
    }));
    items.push(...res.Items);
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/** Registros de una partición cuya SK empieza con `prefix` (por ejemplo, las tomas de un día). */
async function queryPrefix(pk, prefix) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await doc.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :p)',
      ExpressionAttributeValues: { ':pk': pk, ':p': prefix },
      ExclusiveStartKey,
    }));
    items.push(...res.Items);
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/** Registros del índice GSI1 con la partición dada (vista ELEAM). */
async function queryIndex(gsiPk) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await doc.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': gsiPk },
      ExclusiveStartKey,
    }));
    items.push(...res.Items);
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/** BatchWrite en bloques de 25, reintentando lo que DynamoDB no procesó. */
async function batchWrite(requests) {
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    let pendientes = { [TABLE]: requests.slice(i, i + BATCH_SIZE) };
    for (let intento = 0; pendientes && intento < MAX_REINTENTOS; intento++) {
      if (intento > 0) await new Promise((r) => setTimeout(r, 100 * 2 ** intento));
      const res = await doc.send(new BatchWriteCommand({ RequestItems: pendientes }));
      pendientes = res.UnprocessedItems && Object.keys(res.UnprocessedItems).length ? res.UnprocessedItems : null;
    }
    if (pendientes) throw new Error('DynamoDB no procesó todos los registros del lote');
  }
}

const putMany = (items) => batchWrite(items.map((Item) => ({ PutRequest: { Item } })));

const deleteMany = (items) => batchWrite(items.map(({ PK, SK }) => ({ DeleteRequest: { Key: { PK, SK } } })));

async function deletePartition(pk) {
  const items = await queryPartition(pk);
  await deleteMany(items);
  return items.length;
}

module.exports = {
  isConditionFailed, cancellationCodes,
  getItem, getCuenta, queryPartition, queryPrefix, queryIndex, putItem, updateFields, deleteItem, transact, putMany, deleteMany, deletePartition,
};
