import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { docClient, getTableName, key } from '../db';

const tableName = () => getTableName();

export async function listPrograms(tenantId: string): Promise<APIGatewayProxyResultV2> {
  const pk = key.tenant(tenantId).pk;
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: { ':pk': pk, ':sk': key.programSkPrefix },
    })
  );
  const items = (result.Items || []).map((item) => ({
    programId: item.sk?.replace(key.programSkPrefix, ''),
    name: item.name,
    currency: item.currency,
    earnRules: item.earnRules,
    burnRules: item.burnRules,
    tierConfig: item.tierConfig,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programs: items }) };
}

export async function getProgram(tenantId: string, programId: string): Promise<APIGatewayProxyResultV2> {
  const { pk, sk } = key.program(tenantId, programId);
  const result = await docClient.send(
    new GetCommand({ TableName: tableName(), Key: { pk, sk } })
  );
  if (!result.Item) return { statusCode: 404, body: JSON.stringify({ error: 'Program not found' }) };
  const item = result.Item;
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      programId: item.sk?.replace(key.programSkPrefix, ''),
      name: item.name,
      currency: item.currency,
      earnRules: item.earnRules,
      burnRules: item.burnRules,
      tierConfig: item.tierConfig,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }),
  };
}

export async function createProgram(tenantId: string, body: { name?: string; currency?: string }): Promise<APIGatewayProxyResultV2> {
  const programId = `prog_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const { pk, sk } = key.program(tenantId, programId);
  await docClient.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        pk,
        sk,
        name: body.name || 'My Program',
        currency: body.currency || 'INR',
        earnRules: {},
        burnRules: {},
        tierConfig: {},
        createdAt: now,
        updatedAt: now,
      },
    })
  );
  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ programId, name: body.name || 'My Program', currency: body.currency || 'INR' }),
  };
}

export async function updateProgram(
  tenantId: string,
  programId: string,
  body: { name?: string; currency?: string; earnRules?: object; burnRules?: object; tierConfig?: object }
): Promise<APIGatewayProxyResultV2> {
  const { pk, sk } = key.program(tenantId, programId);
  const getResult = await docClient.send(new GetCommand({ TableName: tableName(), Key: { pk, sk } }));
  if (!getResult.Item) return { statusCode: 404, body: JSON.stringify({ error: 'Program not found' }) };
  const now = new Date().toISOString();
  const updated = {
    ...getResult.Item,
    ...(body.name !== undefined && { name: body.name }),
    ...(body.currency !== undefined && { currency: body.currency }),
    ...(body.earnRules !== undefined && { earnRules: body.earnRules }),
    ...(body.burnRules !== undefined && { burnRules: body.burnRules }),
    ...(body.tierConfig !== undefined && { tierConfig: body.tierConfig }),
    updatedAt: now,
  };
  await docClient.send(new PutCommand({ TableName: tableName(), Item: updated }));
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ programId, updatedAt: now }),
  };
}
