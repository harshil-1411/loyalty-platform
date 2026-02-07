# Architecture and Flow Diagrams

This document contains all architecture and flow diagrams for the Loyalty Management Platform. Diagrams are in Mermaid so they stay version-controlled and render in GitLab, GitHub, and most doc tools. For pixel-perfect AWS-style diagrams with official icons, you can recreate the infrastructure view in draw.io using [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/); this file remains the source of truth for structure and flows.

## Table of contents

- [Overall architecture](#1-overall-architecture)
- [AWS infrastructure](#2-aws-infrastructure)
- [Flow: Tenant onboarding and sign-up](#31-tenant-onboarding-and-sign-up)
- [Flow: Program creation and rules](#32-program-creation-and-rules)
- [Flow: Earn transaction](#33-earn-transaction-flow)
- [Flow: Burn and redemption](#34-burn--redemption-flow)
- [Flow: Balance and history view](#35-balance-and-history-view)
- [Flow: Subscription billing](#36-subscription-billing-flow)
- [Flow: Razorpay webhook](#37-razorpay-webhook-flow)
- [Flow: API consumer](#38-api-consumer-flow)
- [Flow: Merchant payment (Phase 2)](#39-merchant-payment-flow-phase-2)
- [Data model](#41-data-model)
- [Multi-tenant isolation](#42-multi-tenant-isolation)
- [Deployment pipeline](#43-deployment-pipeline)

---

## 1. Overall architecture

One-page view of the entire system: actors, front doors, auth, compute, data, and external services.

```mermaid
flowchart LR
  subgraph actors [Users and systems]
    ProgramAdmin[Program Admin]
    EndUser[End-user]
    APIConsumer[API Consumer]
  end

  subgraph edge [Edge]
    CF[CloudFront]
    S3[S3 Static]
  end

  subgraph api [API]
    APIGW[API Gateway]
  end

  subgraph compute [Compute]
    Lambda[Lambda]
  end

  subgraph data [Data]
    DDB[(DynamoDB)]
  end

  subgraph auth [Identity]
    Cognito[Cognito]
  end

  subgraph external [External]
    Razorpay[Razorpay]
  end

  ProgramAdmin -->|HTTPS| CF
  EndUser -->|HTTPS| CF
  CF --> S3
  ProgramAdmin -->|HTTPS API| APIGW
  EndUser -->|HTTPS API| APIGW
  APIConsumer -->|HTTPS API key| APIGW
  APIGW --> Lambda
  Lambda --> DDB
  Lambda --> Cognito
  Lambda -->|API calls| Razorpay
  Razorpay -->|"webhook HTTPS"| APIGW
  ProgramAdmin -.->|login| Cognito
  EndUser -.->|login| Cognito
```

- **Actors:** Program Admin and End-user use the web app (CloudFront + S3); API consumer calls the API with a tenant-scoped API key.
- **Auth:** Cognito for login and JWT; API keys for programmatic access. Lambda uses tenant_id from JWT or API key for all data access.
- **Data:** DynamoDB holds tenants, programs, members, transactions, rewards, and billing state; all partitioned by tenant.
- **Razorpay:** Lambda calls Razorpay for subscriptions and (Phase 2) payments; Razorpay sends webhooks to our API Gateway.

---

## 2. AWS infrastructure

AWS services and how they connect. Grouped by Edge, API, Compute, Data, and Identity; Razorpay is external.

```mermaid
flowchart TB
  subgraph edge [Edge and delivery]
    CloudFront[Amazon CloudFront]
    S3[Amazon S3]
  end

  subgraph api [API]
    APIGateway[Amazon API Gateway HTTP API]
  end

  subgraph compute [Compute]
    LambdaLoyalty[Lambda Loyalty API]
    LambdaBilling[Lambda Billing]
    LambdaWebhook[Lambda Webhook]
  end

  subgraph data [Data]
    DynamoDB[(Amazon DynamoDB)]
  end

  subgraph identity [Identity]
    CognitoPool[Amazon Cognito User Pools]
  end

  subgraph external [External]
    Razorpay[Razorpay]
  end

  CloudFront --> S3
  CloudFront --> APIGateway
  APIGateway --> LambdaLoyalty
  APIGateway --> LambdaBilling
  APIGateway --> LambdaWebhook
  LambdaLoyalty --> DynamoDB
  LambdaBilling --> DynamoDB
  LambdaWebhook --> DynamoDB
  LambdaLoyalty --> CognitoPool
  LambdaBilling --> Razorpay
  LambdaWebhook --> Razorpay
  Razorpay -->|webhook| APIGateway
```

**AWS services used:** CloudFront, S3, API Gateway (HTTP API), Lambda, DynamoDB, Cognito. Optional: Secrets Manager or SSM Parameter Store for Razorpay API keys; IAM roles for Lambda execution.

---

## 3. Flow diagrams

### 3.1 Tenant onboarding and sign-up

Program Admin signs up via Cognito; optional tenant record is created via API and stored in DynamoDB; user is redirected to the dashboard.

```mermaid
sequenceDiagram
  participant Admin as ProgramAdmin
  participant Web as WebApp
  participant Cognito as Cognito
  participant APIGW as APIGW
  participant Lambda as Lambda
  participant DDB as DDB

  Admin->>Web: Sign up form
  Web->>Cognito: SignUp
  Cognito-->>Web: User created
  Web->>Cognito: Confirm sign-in
  Cognito-->>Web: JWT
  Web->>APIGW: Create tenant (with JWT)
  APIGW->>Lambda: Authorize and forward
  Lambda->>DDB: Put tenant record
  Lambda-->>Web: Tenant created
  Web-->>Admin: Redirect to dashboard
```

---

### 3.2 Program creation and rules

Program Admin creates a program and defines earn/burn rules and tiers via the dashboard; WebApp calls API, Lambda persists to DynamoDB.

```mermaid
sequenceDiagram
  participant Admin as ProgramAdmin
  participant Web as WebApp
  participant APIGW as APIGW
  participant Lambda as Lambda
  participant DDB as DDB

  Admin->>Web: Create program and rules
  Web->>APIGW: POST /programs (JWT)
  APIGW->>Lambda: Forward
  Lambda->>Lambda: Validate tenant and limits
  Lambda->>DDB: Put program and rules
  Lambda-->>APIGW: Program created
  APIGW-->>Web: Response
  Web-->>Admin: Program saved
```

---

### 3.3 Earn transaction flow

API consumer or WebApp posts an earn event (e.g. purchase). Lambda validates, applies rules, updates balance in DynamoDB, and returns the new balance. Idempotency key supported when required.

```mermaid
sequenceDiagram
  participant Client as Client or API Consumer
  participant APIGW as APIGW
  participant Lambda as Lambda
  participant DDB as DDB

  Client->>APIGW: POST earn (tenant_id, program_id, member_id, amount, idempotency_key)
  APIGW->>Lambda: Forward
  Lambda->>DDB: Get balance and check idempotency
  Lambda->>Lambda: Apply earn rules and tier
  Lambda->>DDB: Update balance and write transaction
  Lambda-->>APIGW: New balance and transaction id
  APIGW-->>Client: 200 with balance
```

---

### 3.4 Burn and redemption flow

End-user or API redeems a reward. Lambda validates the reward, checks balance, deducts points, records redemption in DynamoDB, and returns success or failure.

```mermaid
sequenceDiagram
  participant User as EndUser or API
  participant Web as WebApp or API
  participant APIGW as APIGW
  participant Lambda as Lambda
  participant DDB as DDB

  User->>Web: Redeem reward
  Web->>APIGW: POST redeem (tenant_id, program_id, member_id, reward_id)
  APIGW->>Lambda: Forward
  Lambda->>DDB: Get reward and balance
  Lambda->>Lambda: Validate balance and eligibility
  Lambda->>DDB: Deduct points and write redemption transaction
  Lambda-->>APIGW: Success or failure
  APIGW-->>Web: Response
  Web-->>User: Redemption result
```

---

### 3.5 Balance and history view

End-user or Admin requests balance or transaction history. Lambda queries DynamoDB by tenant, program, and member and returns balance and list of transactions.

```mermaid
sequenceDiagram
  participant User as EndUser or Admin
  participant Web as WebApp
  participant APIGW as APIGW
  participant Lambda as Lambda
  participant DDB as DDB

  User->>Web: View balance or history
  Web->>APIGW: GET balance or GET transactions (JWT or API key)
  APIGW->>Lambda: Forward
  Lambda->>DDB: Query by tenant and member
  DDB-->>Lambda: Balance and or transactions
  Lambda-->>APIGW: JSON response
  APIGW-->>Web: Data
  Web-->>User: Balance and history
```

---

### 3.6 Subscription billing flow

Program Admin selects a plan (Starter/Growth/Scale). WebApp calls Lambda, which creates a Razorpay subscription or checkout URL; user is redirected to Razorpay Checkout. After payment, redirect back; webhook or callback updates tenant record in DynamoDB.

```mermaid
sequenceDiagram
  participant Admin as ProgramAdmin
  participant Web as WebApp
  participant APIGW as APIGW
  participant Lambda as Lambda
  participant DDB as DDB
  participant Razorpay as Razorpay

  Admin->>Web: Select plan
  Web->>APIGW: POST create subscription (plan_id, JWT)
  APIGW->>Lambda: Forward
  Lambda->>Razorpay: Create subscription or checkout URL
  Razorpay-->>Lambda: Checkout URL or subscription id
  Lambda-->>Web: Redirect URL
  Web-->>Admin: Redirect to Razorpay Checkout
  Admin->>Razorpay: Complete payment
  Razorpay-->>Web: Redirect back with status
  Note over Razorpay,DDB: Razorpay sends webhook to our API
  Razorpay->>APIGW: Webhook subscription.charged
  APIGW->>Lambda: Webhook handler
  Lambda->>DDB: Update tenant plan and billing_status
```

---

### 3.7 Razorpay webhook flow

Razorpay sends a POST to our webhook URL. Lambda verifies the signature, parses the event (e.g. subscription.charged, subscription.cancelled), and updates tenant billing state in DynamoDB. Idempotency by event_id is recommended.

```mermaid
sequenceDiagram
  participant Razorpay as Razorpay
  participant APIGW as APIGW
  participant Lambda as Lambda
  participant DDB as DDB

  Razorpay->>APIGW: POST webhook (signature, event payload)
  APIGW->>Lambda: Invoke webhook handler
  Lambda->>Lambda: Verify signature
  Lambda->>Lambda: Parse event type and event_id
  Lambda->>DDB: Check idempotency for event_id
  Lambda->>DDB: Update tenant billing_status and current_period_end
  Lambda-->>APIGW: 200 OK
  APIGW-->>Razorpay: 200 OK
```

---

### 3.8 API consumer flow

External system (POS, e-commerce) uses a tenant-scoped API key. Request hits API Gateway; Lambda authorizes via API key and performs the same earn/burn logic as web flows; response includes balance or error.

```mermaid
sequenceDiagram
  participant POS as POS or e-commerce
  participant APIGW as APIGW
  participant Lambda as Lambda
  participant DDB as DDB

  POS->>APIGW: POST earn or redeem (API key, tenant_id, program_id, member_id, ...)
  APIGW->>Lambda: Authorize by API key and forward
  Lambda->>Lambda: Resolve tenant from API key
  Lambda->>DDB: Read and write as in earn or redeem flow
  Lambda-->>APIGW: Balance or error
  APIGW-->>POS: Response
```

---

### 3.9 Merchant payment flow (Phase 2)

Optional: tenant initiates a charge to an end-user (e.g. paid reward). WebApp calls Lambda, which creates a Razorpay order or payment link; end-user pays on Razorpay; payment.captured webhook triggers Lambda to record payment and fulfill the reward in DynamoDB.

```mermaid
sequenceDiagram
  participant Admin as ProgramAdmin
  participant EndUser as EndUser
  participant Web as WebApp
  participant APIGW as APIGW
  participant Lambda as Lambda
  participant DDB as DDB
  participant Razorpay as Razorpay

  Admin->>Web: Initiate paid reward for end-user
  Web->>APIGW: POST create payment (reward, amount, member_id)
  APIGW->>Lambda: Forward
  Lambda->>Razorpay: Create order or payment link
  Razorpay-->>Lambda: Payment URL
  Lambda-->>Web: Payment URL
  Web-->>EndUser: Redirect to Razorpay
  EndUser->>Razorpay: Pay
  Razorpay->>APIGW: Webhook payment.captured
  APIGW->>Lambda: Webhook handler
  Lambda->>DDB: Record payment and fulfill reward
  Lambda-->>APIGW: 200 OK
```

*Phase 2 feature.*

---

## 4. Supporting diagrams

### 4.1 Data model

Core entities and relationships. Tenant has many Programs; Program has many Members and many Rewards; Balance is per Member per Program; Transactions (earn/burn/redemption) reference Member, Program, and optionally Reward.

```mermaid
erDiagram
  Tenant ||--o{ Program : has
  Program ||--o{ Member : has
  Program ||--o{ Reward : has
  Program ||--o{ Balance : "member balance"
  Member ||--o{ Balance : has
  Program ||--o{ Transaction : has
  Member ||--o{ Transaction : has
  Reward ||--o| Transaction : "redemption"

  Tenant {
    string tenant_id PK
    string plan_id
    string billing_status
  }

  Program {
    string program_id PK
    string tenant_id FK
    string name
  }

  Member {
    string member_id PK
    string program_id FK
  }

  Reward {
    string reward_id PK
    string program_id FK
    int points_cost
  }

  Balance {
    string composite_key PK
    int points
  }

  Transaction {
    string transaction_id PK
    string tenant_program_member FK
    string type
    int points
  }
```

**DynamoDB key strategy (single-table option):** Partition key often includes `tenant_id` (e.g. `TENANT#<id>` or `PROGRAM#<tenant>#<id>`); sort key distinguishes entity type and scope (e.g. `PROGRAM#<id>`, `MEMBER#<id>`, `BALANCE#<member>`, `TXN#<id>`). All queries are scoped by tenant so no request spans multiple tenants.

---

### 4.2 Multi-tenant isolation

Every API request carries tenant_id (from JWT or API key). Lambda uses tenant_id in DynamoDB partition key and never queries across tenants.

```mermaid
flowchart LR
  subgraph request [Request]
    JWT[JWT or API key]
    JWT --> TenantId[tenant_id extracted]
  end

  subgraph lambda [Lambda]
    TenantId --> Logic[Business logic]
    Logic --> Query[DynamoDB query]
    Query --> PK[Partition key includes tenant_id]
  end

  subgraph ddb [DynamoDB]
    TenantA[Tenant A data]
    TenantB[Tenant B data]
    PK --> TenantA
    PK --> TenantB
  end

  TenantA -.->|never| TenantB
```

- **Tenant A** and **Tenant B** data are stored with different partition key values; no single query returns both.
- **Authorization:** API Gateway (Cognito authorizer or API key) ensures tenant_id is set from the authenticated identity; Lambda does not trust client-supplied tenant_id for cross-tenant access.

---

### 4.3 Deployment pipeline

Code is pushed to GitLab; CI runs lint, tests, and CDK synth; deploy (manual or automated) runs cdk deploy to update AWS (CloudFormation). Optional branches for dev, staging, prod.

```mermaid
flowchart LR
  subgraph source [Source]
    Git[Git push develop or main]
  end

  subgraph ci [GitLab CI]
    Lint[Lint]
    Test[Test]
    Synth[cdk synth]
    Git --> Lint
    Lint --> Test
    Test --> Synth
  end

  subgraph deploy [Deploy]
    CDK[cdk deploy]
    Synth --> CDK
  end

  subgraph aws [AWS]
    CF[CloudFormation]
    CDK --> CF
    CF --> Resources[Lambda, API GW, DDB, S3, etc.]
  end
```

- **Pipeline:** Single pipeline (e.g. on merge to `develop` for dev, `main` for prod); optional manual approval or environment-specific deploy jobs.
- **CDK:** `packages/infra`; `cdk deploy` updates or creates the stack (Lambda, API Gateway, DynamoDB, Cognito, S3, CloudFront, webhook route).

---

## 5. Reference

- **Stack and rationale:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Product scope and flows:** [PRD.md](PRD.md)
- **Tasks and phases:** [TASKS.md](../TASKS.md)
