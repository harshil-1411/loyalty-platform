import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Construct } from 'constructs';

const ENVIRONMENT = 'environment';

/**
 * Root stack for the Loyalty Management Platform.
 * Task 1.1: DynamoDB single-table. Task 1.2: Cognito user pool + app client.
 */
export class LoyaltyPlatformStack extends cdk.Stack {
  /** Single-table for tenants, programs, members, balances, transactions, rewards. */
  public readonly loyaltyTable: dynamodb.Table;

  /** Cognito user pool for Program Admin (and optionally End-user) sign-in. */
  public readonly userPool: cognito.UserPool;

  /** App client for web app (no OAuth for MVP; username/password). */
  public readonly userPoolClient: cognito.UserPoolClient;

  /** HTTP API (API Gateway v2) with base path /api/v1/. */
  public readonly httpApi: apigatewayv2.HttpApi;

  /** CloudFront distribution for web app. */
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext(ENVIRONMENT) as string | undefined;
    const isProd = environment === 'prod';
    const envName = environment || 'dev';

    // Tag the stack for cost and governance (see docs/ARCHITECTURE.md)
    cdk.Tags.of(this).add('Project', 'LoyaltyPlatform');
    cdk.Tags.of(this).add('Environment', envName);

    // Single-table design: pk (partition key), sk (sort key). All data tenant-scoped.
    this.loyaltyTable = new dynamodb.Table(this, 'LoyaltyTable', {
      tableName: `loyalty-${envName}`,
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
    cdk.Tags.of(this.loyaltyTable).add('Environment', envName);

    // Cognito: Program Admin sign-in (email + password). Custom attribute for tenant_id when we link user -> tenant.
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `loyalty-${envName}`,
      signInAliases: { email: true, username: true },
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 10,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: `loyalty-web-${envName}`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    cdk.Tags.of(this.userPool).add('Project', 'LoyaltyPlatform');
    cdk.Tags.of(this.userPool).add('Environment', envName);

    // Task 1.3 + 1.4: API Lambda (hello + programs CRUD); route all /api/v1/* to it
    const apiDir = path.join(__dirname, '../../api');
    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      code: lambda.Code.fromAsset(apiDir, { exclude: ['node_modules', '*.ts', 'test'] }),
      handler: 'dist/handlers/router.handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: { TABLE_NAME: this.loyaltyTable.tableName },
    });
    this.loyaltyTable.grantReadWriteData(apiHandler);

    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `loyalty-${envName}`,
      description: 'Loyalty Platform API v1',
    });

    const apiIntegration = new apigatewayv2integrations.HttpLambdaIntegration('ApiIntegration', apiHandler);
    this.httpApi.addRoutes({
      path: '/api/v1/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: apiIntegration,
    });

    // Phase 2: Web app — S3 + CloudFront
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
    const webOrigin = new s3deploy.BucketDeployment(this, 'WebDeploy', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../web/dist'))],
      destinationBucket: webBucket,
    });
    this.distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: new cloudfront_origins.S3Origin(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });
    this.distribution.node.addDependency(webOrigin);
  }
}
