import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { docClient, getTableName, key } from '../db';

const tableName = () => getTableName();

export async function earn(
  tenantId: string,
  programId: string,
  body: { memberId: string; points: number; idempotencyKey?: string }
): Promise<APIGatewayProxyResultV2> {
  const { memberId, points, idempotencyKey } = body;
  if (!memberId || points == null || points < 0)
    return { statusCode: 400, body: JSON.stringify({ error: 'memberId and non-negative points required' }) };
  const pk = `TENANT#${tenantId}#PROGRAM#${programId}`;
  const skBalance = `BALANCE#${memberId}`;
  const txnId = idempotencyKey ?? `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const skTxn = `TXN#${now}#${txnId}`;

  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk, sk: skBalance },
      UpdateExpression: 'SET points = if_not_exists(points, :zero) + :pts, updatedAt = :now',
      ExpressionAttributeValues: { ':zero': 0, ':pts': points, ':now': now },
    })
  );
  await docClient.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        pk,
        sk: skTxn,
        type: 'earn',
        memberId,
        points,
        idempotencyKey: idempotencyKey ?? null,
        createdAt: now,
        gsi1pk: `TENANT#${tenantId}`,
        gsi1sk: `TXN#${programId}#${now}#${txnId}`,
      },
    })
  );
  const getBalance = await docClient.send(new GetCommand({ TableName: tableName(), Key: { pk, sk: skBalance } }));
  const balance = getBalance.Item?.points ?? points;
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId: txnId, balance, points }),
  };
}

export async function burn(
  tenantId: string,
  programId: string,
  body: { memberId: string; points: number }
): Promise<APIGatewayProxyResultV2> {
  const { memberId, points } = body;
  if (!memberId || points == null || points < 0)
    return { statusCode: 400, body: JSON.stringify({ error: 'memberId and non-negative points required' }) };
  const pk = `TENANT#${tenantId}#PROGRAM#${programId}`;
  const skBalance = `BALANCE#${memberId}`;
  const res = await docClient.send(new GetCommand({ TableName: tableName(), Key: { pk, sk: skBalance } }));
  const current = res.Item?.points ?? 0;
  if (current < points)
    return { statusCode: 400, body: JSON.stringify({ error: 'Insufficient balance', balance: current }) };
  const now = new Date().toISOString();
  const txnId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const skTxn = `TXN#${now}#${txnId}`;

  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk, sk: skBalance },
      UpdateExpression: 'SET points = points - :pts, updatedAt = :now',
      ExpressionAttributeValues: { ':pts': points, ':now': now },
    })
  );
  await docClient.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        pk,
        sk: skTxn,
        type: 'burn',
        memberId,
        points,
        createdAt: now,
        gsi1pk: `TENANT#${tenantId}`,
        gsi1sk: `TXN#${programId}#${now}#${txnId}`,
      },
    })
  );
  const newBalance = current - points;
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId: txnId, balance: newBalance, points }),
  };
}

export async function getBalance(
  tenantId: string,
  programId: string,
  memberId: string
): Promise<APIGatewayProxyResultV2> {
  const pk = `TENANT#${tenantId}#PROGRAM#${programId}`;
  const sk = `BALANCE#${memberId}`;
  const res = await docClient.send(new GetCommand({ TableName: tableName(), Key: { pk, sk } }));
  const points = res.Item?.points ?? 0;
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, programId, balance: points }),
  };
}
