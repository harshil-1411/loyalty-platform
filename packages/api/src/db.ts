import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);

export function getTableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error('TABLE_NAME is not set');
  return name;
}

export const key = {
  tenant: (tenantId: string) => ({ pk: `TENANT#${tenantId}`, sk: 'TENANT' }),
  program: (tenantId: string, programId: string) => ({ pk: `TENANT#${tenantId}`, sk: `PROGRAM#${programId}` }),
  programSkPrefix: 'PROGRAM#',
};
