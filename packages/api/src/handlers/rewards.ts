import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { docClient, getTableName } from '../db';

const tableName = () => getTableName();

export async function listRewards(tenantId: string, programId: string): Promise<APIGatewayProxyResultV2> {
  const pk = `TENANT#${tenantId}#PROGRAM#${programId}`;
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: { ':pk': pk, ':sk': 'REWARD#' },
    })
  );
  const items = (result.Items || []).map((item) => ({
    rewardId: item.sk?.replace('REWARD#', ''),
    name: item.name,
    pointsCost: item.pointsCost,
    tierEligibility: item.tierEligibility,
  }));
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rewards: items }) };
}

export async function createReward(
  tenantId: string,
  programId: string,
  body: { name: string; pointsCost: number }
): Promise<APIGatewayProxyResultV2> {
  const rewardId = `rew_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const pk = `TENANT#${tenantId}#PROGRAM#${programId}`;
  const sk = `REWARD#${rewardId}`;
  await docClient.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        pk,
        sk,
        name: body.name ?? 'Reward',
        pointsCost: body.pointsCost ?? 0,
        tierEligibility: null,
        createdAt: now,
        updatedAt: now,
      },
    })
  );
  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rewardId, name: body.name ?? 'Reward', pointsCost: body.pointsCost ?? 0 }),
  };
}

export async function redeem(
  tenantId: string,
  programId: string,
  body: { memberId: string; rewardId: string }
): Promise<APIGatewayProxyResultV2> {
  const { memberId, rewardId } = body;
  if (!memberId || !rewardId)
    return { statusCode: 400, body: JSON.stringify({ error: 'memberId and rewardId required' }) };
  const pk = `TENANT#${tenantId}#PROGRAM#${programId}`;
  const rewardRes = await docClient.send(new GetCommand({ TableName: tableName(), Key: { pk, sk: `REWARD#${rewardId}` } }));
  const reward = rewardRes.Item;
  if (!reward) return { statusCode: 404, body: JSON.stringify({ error: 'Reward not found' }) };
  const cost = reward.pointsCost ?? 0;
  const balanceSk = `BALANCE#${memberId}`;
  const balanceRes = await docClient.send(new GetCommand({ TableName: tableName(), Key: { pk, sk: balanceSk } }));
  const current = balanceRes.Item?.points ?? 0;
  if (current < cost)
    return { statusCode: 400, body: JSON.stringify({ error: 'Insufficient points', balance: current, required: cost }) };
  const now = new Date().toISOString();
  const txnId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const skTxn = `TXN#${now}#${txnId}`;

  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { pk, sk: balanceSk },
      UpdateExpression: 'SET points = points - :cost, updatedAt = :now',
      ExpressionAttributeValues: { ':cost': cost, ':now': now },
    })
  );
  await docClient.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        pk,
        sk: skTxn,
        type: 'redemption',
        memberId,
        rewardId,
        points: cost,
        createdAt: now,
        gsi1pk: `TENANT#${tenantId}`,
        gsi1sk: `TXN#${programId}#${now}#${txnId}`,
      },
    })
  );
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId: txnId, rewardId, pointsDeducted: cost, balance: current - cost }),
  };
}
