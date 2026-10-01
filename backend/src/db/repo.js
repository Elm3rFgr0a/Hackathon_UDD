// Operaciones genéricas sobre la tabla. Las rutas no hablan con DynamoDB
// directamente: pasan por aquí.

const { GetCommand, QueryCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { doc, TABLE } = require('./client');
const { keys } = require('./keys');

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

module.exports = { getItem, getCuenta, queryPartition, putMany, deleteMany, deletePartition };
