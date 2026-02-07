import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

/**
 * GET /api/v1/hello — health/readiness for API Gateway.
 * Task 1.3: tenant-scoped auth will be added via authorizer; for now returns 200.
 */
export const handler: APIGatewayProxyHandlerV2 = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello from Loyalty API', version: 'v1' }),
  };
};
