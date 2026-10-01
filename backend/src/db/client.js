const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const TABLE = process.env.TABLE_NAME;

const doc = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }),
  { marshallOptions: { removeUndefinedValues: true } },
);

module.exports = { doc, TABLE };
