import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
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

    // Cognito: Program Admin sign-in (email + password). Custom attribute for tenant_id (JWT claim: custom:tenant_id).
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `loyalty-${envName}`,
      signInAliases: { email: true, username: true },
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      customAttributes: {
        tenant_id: new cognito.StringAttribute({ mutable: true, minLen: 1, maxLen: 128 }),
      },
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

    // Web app (create before API so we can pass CORS origin — dev/prod parity)
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

    const webOriginUrl = `https://${this.distribution.distributionDomainName}`;
    const corsOrigins = isProd ? webOriginUrl : `${webOriginUrl},http://localhost:5173`;

    // Razorpay secrets in SSM (same pattern dev/prod). Lambda reads at runtime via param names.
    const razorpayWebhookSecretParam = new ssm.StringParameter(this, 'RazorpayWebhookSecretParam', {
      parameterName: `/loyalty/${envName}/razorpay/webhook-secret`,
      stringValue: 'REPLACE_ME',
      description: 'Razorpay webhook signing secret; replace with value from Razorpay Dashboard',
    });
    const razorpayKeyIdParam = new ssm.StringParameter(this, 'RazorpayKeyIdParam', {
      parameterName: `/loyalty/${envName}/razorpay/key-id`,
      stringValue: '',
      description: 'Razorpay API key ID (optional, for subscription-link)',
    });
    const razorpayKeySecretParam = new ssm.StringParameter(this, 'RazorpayKeySecretParam', {
      parameterName: `/loyalty/${envName}/razorpay/key-secret`,
      stringValue: '',
      description: 'Razorpay API key secret (optional, for subscription-link)',
    });

    // Backend: Python FastAPI (Mangum) — same auth/CORS shape as prod; explicit origins only
    const backendDir = path.join(__dirname, '../../backend');
    const apiHandler = new lambda.DockerImageFunction(this, 'ApiHandler', {
      code: lambda.DockerImageCode.fromImageAsset(backendDir, {
        file: 'Dockerfile',
        exclude: ['tests', 'scripts', '.venv', '__pycache__', '*.pyc', '.pytest_cache'],
      }),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        TABLE_NAME: this.loyaltyTable.tableName,
        CORS_ORIGINS: corsOrigins,
        LOG_LEVEL: isProd ? 'INFO' : 'DEBUG',
        RATE_LIMIT_REQUESTS: '100',
        RATE_LIMIT_WINDOW_SEC: '60',
        USER_POOL_ID: this.userPool.userPoolId,
        RAZORPAY_WEBHOOK_SECRET_PARAM: razorpayWebhookSecretParam.parameterName,
        RAZORPAY_KEY_ID_PARAM: razorpayKeyIdParam.parameterName,
        RAZORPAY_KEY_SECRET_PARAM: razorpayKeySecretParam.parameterName,
      },
    });
    this.loyaltyTable.grantReadWriteData(apiHandler);
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminUpdateUserAttributes'],
        resources: [this.userPool.userPoolArn],
      }),
    );
    razorpayWebhookSecretParam.grantRead(apiHandler);
    razorpayKeyIdParam.grantRead(apiHandler);
    razorpayKeySecretParam.grantRead(apiHandler);

    // Task 3.4: Lambda log retention for cost control and monitoring
    new logs.LogRetention(this, 'ApiHandlerLogRetention', {
      logGroupName: `/aws/lambda/${apiHandler.functionName}`,
      retention: isProd ? logs.RetentionDays.THREE_MONTHS : logs.RetentionDays.ONE_MONTH,
    });

    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `loyalty-${envName}`,
      description: 'Loyalty Platform API v1',
    });

    // Lambda authorizer: validate Cognito JWT and pass tenantId to backend. Prod: require custom:tenant_id (no default).
    const authorizerDir = path.join(__dirname, '../authorizer');
    const authorizerFn = new lambda.DockerImageFunction(this, 'Authorizer', {
      code: lambda.DockerImageCode.fromImageAsset(authorizerDir, {
        file: 'Dockerfile',
      }),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        USER_POOL_ID: this.userPool.userPoolId,
        CLIENT_ID: this.userPoolClient.userPoolClientId,
        // Dev only: allow users without custom:tenant_id to use tenant "default". Prod: leave unset to deny.
        ...(isProd ? {} : { DEFAULT_TENANT_ID: 'default' }),
      },
    });
    const authorizer = new apigatewayv2authorizers.HttpLambdaAuthorizer('CognitoAuthorizer', authorizerFn, {
      responseTypes: [apigatewayv2authorizers.HttpLambdaResponseType.SIMPLE],
    });

    const apiIntegration = new apigatewayv2integrations.HttpLambdaIntegration('ApiIntegration', apiHandler);

    // Webhooks (e.g. Razorpay) — no JWT; backend must verify signature via RAZORPAY_WEBHOOK_SECRET (same in dev/prod)
    this.httpApi.addRoutes({
      path: '/api/v1/webhooks/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: apiIntegration,
      authorizer: new apigatewayv2.HttpNoneAuthorizer(),
    });

    // Protected API — Cognito JWT required; authorizer sets tenantId for backend
    this.httpApi.addRoutes({
      path: '/api/v1/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: apiIntegration,
      authorizer,
    });

    // Outputs for frontend config (e.g. .env or build-time env)
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID for web app (VITE_COGNITO_USER_POOL_ID)',
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID for web app (VITE_COGNITO_CLIENT_ID)',
    });
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.httpApi.apiEndpoint,
      description: 'API base URL for web app (VITE_API_URL)',
    });
    new cdk.CfnOutput(this, 'WebUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront URL for web app',
    });

    // Monitoring: dashboard and alarm (dev/prod parity)
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `loyalty-${envName}`,
      defaultInterval: cdk.Duration.days(1),
    });
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API 4xx',
        left: [this.httpApi.metricClientError()],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'API 5xx',
        left: [this.httpApi.metricServerError()],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'API count',
        left: [this.httpApi.metricCount()],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Lambda errors',
        left: [apiHandler.metricErrors()],
        width: 8,
      }),
    );
    new cloudwatch.Alarm(this, 'ApiLambdaErrorsAlarm', {
      alarmName: `loyalty-${envName}-api-errors`,
      metric: apiHandler.metricErrors(),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }
}
