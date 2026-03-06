import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as budgets from 'aws-cdk-lib/aws-budgets';
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
import { execSync } from 'child_process';
import { Construct } from 'constructs';

export type EnvironmentName = 'dev' | 'demo' | 'prod';

export interface LoyaltyStackProps extends cdk.StackProps {
  /** Which environment this stack represents. Drives resource naming and config. */
  environment: EnvironmentName;
  /** Email address to receive AWS Budget overage alerts. */
  budgetAlertEmail: string;
}

/** Monthly budget cap (USD) per environment. */
const BUDGET_LIMITS: Record<EnvironmentName, number> = {
  dev: 50,
  demo: 100,
  prod: 500,
};

/**
 * Root stack for the Loyalty Management Platform.
 * Supports three isolated environments: dev | demo | prod.
 */
export class LoyaltyPlatformStack extends cdk.Stack {
  /** Single-table for tenants, programs, members, balances, transactions, rewards. */
  public readonly loyaltyTable: dynamodb.Table;

  /** Cognito user pool for Program Admin sign-in. */
  public readonly userPool: cognito.UserPool;

  /** App client for web app (no OAuth for MVP; username/password). */
  public readonly userPoolClient: cognito.UserPoolClient;

  /** HTTP API (API Gateway v2) with base path /api/v1/. */
  public readonly httpApi: apigatewayv2.HttpApi;

  /** CloudFront distribution for web app. */
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: LoyaltyStackProps) {
    super(scope, id, props);

    const { environment, budgetAlertEmail } = props;
    const envName: EnvironmentName = environment;
    const isProd = envName === 'prod';

    // ── Governance tags ────────────────────────────────────────────────────────
    // cdk.Tags.of(this) propagates to every resource in the stack automatically.
    cdk.Tags.of(this).add('Project',     'LoyaltyPlatform');
    cdk.Tags.of(this).add('Environment', envName);
    cdk.Tags.of(this).add('CostCenter',  `loyalty-${envName}`);
    cdk.Tags.of(this).add('Owner',       'loyalty-team');
    cdk.Tags.of(this).add('Service',     'loyalty-platform');

    // ── DynamoDB ───────────────────────────────────────────────────────────────
    this.loyaltyTable = new dynamodb.Table(this, 'LoyaltyTable', {
      tableName: `loyalty-${envName}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: isProd,
      timeToLiveAttribute: 'ttl',
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    this.loyaltyTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ── Cognito ────────────────────────────────────────────────────────────────
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
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: `loyalty-web-${envName}`,
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
      generateSecret: false,
    });

    // ── S3 + CloudFront (frontend) ─────────────────────────────────────────────
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
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
    const corsOrigins = isProd
      ? webOriginUrl
      : `${webOriginUrl},http://localhost:5173,http://localhost:5174`;

    // ── Razorpay secrets (SSM) ─────────────────────────────────────────────────
    const razorpayWebhookSecretParam = new ssm.StringParameter(this, 'RazorpayWebhookSecretParam', {
      parameterName: `/loyalty/${envName}/razorpay/webhook-secret`,
      stringValue: 'REPLACE_ME',
      description: 'Razorpay webhook signing secret; replace with value from Razorpay Dashboard',
    });
    const razorpayKeyIdParam = new ssm.StringParameter(this, 'RazorpayKeyIdParam', {
      parameterName: `/loyalty/${envName}/razorpay/key-id`,
      stringValue: 'REPLACE_ME',
      description: 'Razorpay API key ID (optional, for subscription-link)',
    });
    const razorpayKeySecretParam = new ssm.StringParameter(this, 'RazorpayKeySecretParam', {
      parameterName: `/loyalty/${envName}/razorpay/key-secret`,
      stringValue: 'REPLACE_ME',
      description: 'Razorpay API key secret (optional, for subscription-link)',
    });
    const razorpayPlanStarterParam = new ssm.StringParameter(this, 'RazorpayPlanStarterParam', {
      parameterName: `/loyalty/${envName}/razorpay/plan-starter`,
      stringValue: 'REPLACE_ME',
      description: 'Razorpay plan ID for the Starter tier',
    });
    const razorpayPlanGrowthParam = new ssm.StringParameter(this, 'RazorpayPlanGrowthParam', {
      parameterName: `/loyalty/${envName}/razorpay/plan-growth`,
      stringValue: 'REPLACE_ME',
      description: 'Razorpay plan ID for the Growth tier',
    });
    const razorpayPlanScaleParam = new ssm.StringParameter(this, 'RazorpayPlanScaleParam', {
      parameterName: `/loyalty/${envName}/razorpay/plan-scale`,
      stringValue: 'REPLACE_ME',
      description: 'Razorpay plan ID for the Scale tier',
    });

    // ── API Lambda ─────────────────────────────────────────────────────────────
    const backendDir = path.join(__dirname, '../../backend');
    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'app.main.handler',
      code: lambda.Code.fromAsset(backendDir, {
        bundling: {
          image: lambda.Runtime.PYTHON_3_11.bundlingImage,
          local: {
            tryBundle(outputDir: string): boolean {
              try {
                const pipCmd = process.platform === 'win32' ? 'py -m pip' : 'pip3';
                const cpCmd = process.platform === 'win32'
                  ? `xcopy src\\app "${outputDir}\\app" /E /I /Q /Y`
                  : `cp -r src/app "${outputDir}/app"`;
                execSync(
                  `${pipCmd} install -r requirements.txt -t "${outputDir}" --platform manylinux2014_x86_64 --python-version 3.11 --only-binary=:all: --implementation cp`,
                  { cwd: backendDir, stdio: 'inherit' }
                );
                execSync(cpCmd, { cwd: backendDir });
                return true;
              } catch (_e) {
                return false;
              }
            },
          },
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && cp -r src/app /asset-output/app',
          ],
        },
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
        USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId,
        FRONTEND_URL: webOriginUrl,
        RAZORPAY_WEBHOOK_SECRET_PARAM: razorpayWebhookSecretParam.parameterName,
        RAZORPAY_KEY_ID_PARAM: razorpayKeyIdParam.parameterName,
        RAZORPAY_KEY_SECRET_PARAM: razorpayKeySecretParam.parameterName,
        RAZORPAY_PLAN_STARTER_PARAM: razorpayPlanStarterParam.parameterName,
        RAZORPAY_PLAN_GROWTH_PARAM: razorpayPlanGrowthParam.parameterName,
        RAZORPAY_PLAN_SCALE_PARAM: razorpayPlanScaleParam.parameterName,
        ...(!isProd && { SUPER_ADMIN_BYPASS: 'true' }),
      },
    });
    this.loyaltyTable.grantReadWriteData(apiHandler);
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminUpdateUserAttributes', 'cognito-idp:ListUsers', 'cognito-idp:ListUsersInGroup', 'cognito-idp:AdminGetUser', 'cognito-idp:AdminDisableUser', 'cognito-idp:AdminEnableUser', 'cognito-idp:AdminResetUserPassword', 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword', 'cognito-idp:AdminInitiateAuth'],
        resources: [this.userPool.userPoolArn],
      }),
    );
    razorpayWebhookSecretParam.grantRead(apiHandler);
    razorpayKeyIdParam.grantRead(apiHandler);
    razorpayKeySecretParam.grantRead(apiHandler);
    razorpayPlanStarterParam.grantRead(apiHandler);
    razorpayPlanGrowthParam.grantRead(apiHandler);
    razorpayPlanScaleParam.grantRead(apiHandler);

    new logs.LogRetention(this, 'ApiHandlerLogRetention', {
      logGroupName: `/aws/lambda/${apiHandler.functionName}`,
      retention: isProd ? logs.RetentionDays.THREE_MONTHS : logs.RetentionDays.ONE_MONTH,
    });

    // ── API Gateway ────────────────────────────────────────────────────────────
    const corsOriginList = corsOrigins.split(',').map((o) => o.trim()).filter(Boolean);
    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `loyalty-${envName}`,
      description: 'Loyalty Platform API v1',
      corsPreflight: {
        allowOrigins: corsOriginList,
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.PATCH,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Request-ID', 'X-API-Key'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // ── Lambda Authorizer ──────────────────────────────────────────────────────
    const authorizerDir = path.join(__dirname, '../authorizer');
    const authorizerFn = new lambda.Function(this, 'Authorizer', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(authorizerDir, {
        bundling: {
          image: lambda.Runtime.PYTHON_3_11.bundlingImage,
          local: {
            tryBundle(outputDir: string): boolean {
              try {
                const pipCmd = process.platform === 'win32' ? 'py -m pip' : 'pip3';
                const cpCmd = process.platform === 'win32'
                  ? `copy handler.py "${outputDir}\\"`
                  : `cp handler.py "${outputDir}/"`;
                execSync(
                  `${pipCmd} install -r requirements.txt -t "${outputDir}" --platform manylinux2014_x86_64 --python-version 3.11 --only-binary=:all: --implementation cp`,
                  { cwd: authorizerDir, stdio: 'inherit' }
                );
                execSync(cpCmd, { cwd: authorizerDir });
                return true;
              } catch (_e) {
                return false;
              }
            },
          },
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && cp handler.py /asset-output/',
          ],
        },
      }),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        USER_POOL_ID: this.userPool.userPoolId,
        CLIENT_ID: this.userPoolClient.userPoolClientId,
        TABLE_NAME: this.loyaltyTable.tableName,
        // Dev + demo: allow users without custom:tenant_id to use tenant "default". Prod: deny.
        ...(isProd ? {} : { DEFAULT_TENANT_ID: 'default' }),
      },
    });
    this.loyaltyTable.grantReadData(authorizerFn);
    const authorizer = new apigatewayv2authorizers.HttpLambdaAuthorizer('CognitoAuthorizer', authorizerFn, {
      responseTypes: [apigatewayv2authorizers.HttpLambdaResponseType.SIMPLE],
    });

    const apiIntegration = new apigatewayv2integrations.HttpLambdaIntegration('ApiIntegration', apiHandler);

    // Public auth routes — no JWT (e.g. validate-key for salon self-service connection)
    this.httpApi.addRoutes({
      path: '/api/v1/auth/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.POST,
      ],
      integration: apiIntegration,
      authorizer: new apigatewayv2.HttpNoneAuthorizer(),
    });

    // Webhooks — no JWT; backend verifies HMAC signature
    this.httpApi.addRoutes({
      path: '/api/v1/webhooks/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: apiIntegration,
      authorizer: new apigatewayv2.HttpNoneAuthorizer(),
    });

    // Protected API — Cognito JWT required
    this.httpApi.addRoutes({
      path: '/api/v1/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: apiIntegration,
      authorizer,
    });

    // ── CloudFormation Outputs ─────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID (VITE_COGNITO_USER_POOL_ID)',
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID (VITE_COGNITO_CLIENT_ID)',
    });
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.httpApi.apiEndpoint,
      description: 'API base URL (VITE_API_URL)',
    });
    new cdk.CfnOutput(this, 'WebUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront URL for web app',
    });

    // ── CloudWatch (monitoring) ────────────────────────────────────────────────
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

    // ── AWS Budgets ────────────────────────────────────────────────────────────
    // Disabled: AWS::Budgets::Budget is not supported by CloudFormation in eu-north-1.
    // Re-enable by deploying from us-east-1 or once the region adds support.
    // new budgets.CfnBudget(this, 'MonthlyBudget', {
    //   budget: {
    //     budgetName: `loyalty-${envName}-monthly`,
    //     budgetType: 'COST',
    //     timeUnit: 'MONTHLY',
    //     budgetLimit: { amount: BUDGET_LIMITS[envName], unit: 'USD' },
    //     costFilters: { TagKeyValue: [`user:CostCenter$loyalty-${envName}`] },
    //   },
    //   notificationsWithSubscribers: [...],
    // });
  }
}
