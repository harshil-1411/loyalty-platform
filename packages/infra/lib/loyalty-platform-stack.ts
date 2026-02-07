import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

const ENVIRONMENT = 'environment';

/**
 * Root stack for the Loyalty Management Platform.
 * Task 1.1: Single DynamoDB table with tenant isolation; key design in docs/DYNAMODB_KEYS.md.
 */
export class LoyaltyPlatformStack extends cdk.Stack {
  /** Single-table for tenants, programs, members, balances, transactions, rewards. */
  public readonly loyaltyTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext(ENVIRONMENT) as string | undefined;
    const isProd = environment === 'prod';

    // Tag the stack for cost and governance (see docs/ARCHITECTURE.md)
    cdk.Tags.of(this).add('Project', 'LoyaltyPlatform');
    cdk.Tags.of(this).add('Environment', environment || 'dev');

    // Single-table design: pk (partition key), sk (sort key). All data tenant-scoped.
    // GSI1: tenant-wide transaction list for analytics (GSI1PK=TENANT#id, GSI1SK=TXN#...).
    this.loyaltyTable = new dynamodb.Table(this, 'LoyaltyTable', {
      tableName: `loyalty-${environment || 'dev'}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: isProd,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    this.loyaltyTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    cdk.Tags.of(this.loyaltyTable).add('Project', 'LoyaltyPlatform');
    cdk.Tags.of(this.loyaltyTable).add('Environment', environment || 'dev');
  }
}
