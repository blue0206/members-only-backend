import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apiGatewayV2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { DomainName } from 'aws-cdk-lib/aws-apigatewayv2';
import { getEnv } from './envConfig';

export class InfrastructureStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'MembersOnlyVPC', {
            vpcId: 'vpc-0ee4e8f7eacd0b7c1',
        });

        //---------------------------------API GATEWAY-------------------------------------

        const apiDomainName = 'api-v2.nevery.shop';

        // Create certificate for domain.
        const certificate = new acm.Certificate(this, 'ApiCertificate', {
            domainName: apiDomainName,
            validation: acm.CertificateValidation.fromDns(),
        });

        // Create domain name with certificate.
        const domainName = new DomainName(this, 'ApiDomainName', {
            domainName: apiDomainName,
            certificate,
        });

        const httpApi = new apiGatewayV2.HttpApi(this, 'MembersOnlyHttpApiGateway', {
            apiName: 'members-only-api',
            description: 'HTTP API Gateway for Members Only Services.',
            corsPreflight: {
                allowHeaders: [
                    'Content-Type',
                    'Authorization',
                    'x-csrf-token', // For csrf verification (double submit method).
                    'x-internal-api-secret', // For event dispatch from service lambdas.
                ],
                allowMethods: [
                    apiGatewayV2.CorsHttpMethod.GET,
                    apiGatewayV2.CorsHttpMethod.POST,
                    apiGatewayV2.CorsHttpMethod.PUT,
                    apiGatewayV2.CorsHttpMethod.DELETE,
                    apiGatewayV2.CorsHttpMethod.OPTIONS,
                    apiGatewayV2.CorsHttpMethod.PATCH,
                ],
                allowCredentials: true,
                allowOrigins: ['https://cloud.nevery.shop'],
            },
            defaultDomainMapping: {
                domainName,
            },
            disableExecuteApiEndpoint: true,
        });

        // Output regional domain name on terminal after deploy.
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: domainName.regionalDomainName,
            description: 'Public URL for API Gateway.',
        });

        //----------------------------------LAMBDA FUNCTIONS------------------------------------

        // All lambdas share the same security group.
        const lambdaSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
            this,
            'LambdaSG',
            'sg-0b941c07edf04afb0'
        );

        // All lambdas are placed in two private subnets.
        const lambdaSubnetOne = ec2.Subnet.fromSubnetId(
            this,
            'LambdaSubnet1',
            'subnet-072cce2ce52ef1014'
        );
        const lambdaSubnetTwo = ec2.Subnet.fromSubnetId(
            this,
            'LambdaSubnet2',
            'subnet-02d32fadd6ecd1c5d'
        );

        // Disable warning associated with no route table ID for subnet.
        cdk.Annotations.of(lambdaSubnetOne).acknowledgeWarning(
            '@aws-cdk/aws-ec2:noSubnetRouteTableId',
            'Will not read route table ID for subnet'
        );
        cdk.Annotations.of(lambdaSubnetTwo).acknowledgeWarning(
            '@aws-cdk/aws-ec2:noSubnetRouteTableId',
            'Will not read route table ID for subnet'
        );

        //---------------------------1. Auth Service

        const authServiceLambda = this.createLambda(
            'AuthServiceLambda',
            'auth-service',
            256,
            cdk.Duration.seconds(25),
            '../packages/auth-service/src/lambda.ts',
            vpc,
            [lambdaSubnetOne, lambdaSubnetTwo],
            [lambdaSecurityGroup]
        );

        // Auth service lambda integration with API Gateway.
        const authLambdaIntegration = new HttpLambdaIntegration(
            'AuthServiceIntegration',
            authServiceLambda
        );

        // Setup auth routes to trigger auth lambda.
        httpApi.addRoutes({
            path: '/api/v1/auth/{proxy+}',
            methods: [apiGatewayV2.HttpMethod.ANY],
            integration: authLambdaIntegration,
        });

        //---------------------------2. User Service

        const userServiceLambda = this.createLambda(
            'UserServiceLambda',
            'user-service',
            256,
            cdk.Duration.seconds(25),
            '../packages/user-service/src/lambda.ts',
            vpc,
            [lambdaSubnetOne, lambdaSubnetTwo],
            [lambdaSecurityGroup]
        );

        // User service lambda integration with API Gateway.
        const userLambdaIntegration = new HttpLambdaIntegration(
            'UserLambdaIntegration',
            userServiceLambda
        );

        // Setup user routes to trigger user lambda.
        httpApi.addRoutes({
            // Absence of this route causes NOT FOUND errors with a false positive
            // CORS issue on frontend making request without a trailing slash.
            path: '/api/v1/users', // Allow requests at root level without requiring a trailing slash.
            methods: [apiGatewayV2.HttpMethod.ANY],
            integration: userLambdaIntegration,
        });
        httpApi.addRoutes({
            path: '/api/v1/users/{proxy+}',
            methods: [apiGatewayV2.HttpMethod.ANY],
            integration: userLambdaIntegration,
        });

        //---------------------------3. Message Service

        const messageServiceLambda = this.createLambda(
            'MessageServiceLambda',
            'message-service',
            256,
            cdk.Duration.seconds(25),
            '../packages/message-service/src/lambda.ts',
            vpc,
            [lambdaSubnetOne, lambdaSubnetTwo],
            [lambdaSecurityGroup]
        );

        // Message service lambda integration with API Gateway.
        const messageLambdaIntegration = new HttpLambdaIntegration(
            'MessageLambdaIntegration',
            messageServiceLambda
        );

        // Setup message routes to trigger message lambda.
        httpApi.addRoutes({
            // Absence of this route causes NOT FOUND errors with a false positive
            // CORS issue on frontend making request without a trailing slash.
            path: '/api/v1/messages', // Allow requests at root level without requiring a trailing slash.
            methods: [apiGatewayV2.HttpMethod.ANY],
            integration: messageLambdaIntegration,
        });
        httpApi.addRoutes({
            path: '/api/v1/messages/{proxy+}',
            methods: [apiGatewayV2.HttpMethod.ANY],
            integration: messageLambdaIntegration,
        });

        //---------------------------4. User Activity Ping Flush

        const userActivityWorkerLambda = this.createLambda(
            'UserActivityWorkerLambda',
            'user-activity-worker',
            128,
            cdk.Duration.seconds(16),
            '../packages/activity-service/src/index.ts',
            vpc,
            [lambdaSubnetOne, lambdaSubnetTwo],
            [lambdaSecurityGroup]
        );

        // SQS queue for storing user activity pings.
        const userActivityQueue = new sqs.Queue(this, 'UserActivityQueue', {
            queueName: 'user-activity-queue',
            fifo: false,
        });

        // Set SQS as trigger. The lambda function will be trigger either if
        // there are at least 11 records in queue or every 5 minutes.
        userActivityWorkerLambda.addEventSource(
            new lambdaEventSources.SqsEventSource(userActivityQueue, {
                batchSize: 11,
                maxBatchingWindow: cdk.Duration.minutes(5),
            })
        );

        // Grant service lambdas permission to send messages to queue.
        userActivityQueue.grantSendMessages(authServiceLambda);
        userActivityQueue.grantSendMessages(userServiceLambda);
        userActivityQueue.grantSendMessages(messageServiceLambda);

        //---------------------------5. Expired Refresh Token Cleanup

        const tokenCleanupWorkerLambda = this.createLambda(
            'TokenCleanupWorkerLambda',
            'token-cleanup-worker',
            128,
            cdk.Duration.seconds(16),
            '../packages/cleanup-service/src/index.ts',
            vpc,
            [lambdaSubnetOne, lambdaSubnetTwo],
            [lambdaSecurityGroup]
        );

        // Setup Event Scheduler to create a schedule to trigger
        // token cleanup lambda every day.
        new events.Rule(this, 'TokenCleanupScheduleRule', {
            ruleName: 'expired-token-cleanup-rule',
            schedule: events.Schedule.rate(cdk.Duration.days(1)),
            targets: [new targets.LambdaFunction(tokenCleanupWorkerLambda)],
        });

        //--------------------------------SSE SERVICE + NAT EC2 INSTANCE--------------------------------

        // This is a NAT + SSE Service EC2 instance. Acts as SSE service which NEEDS to be stateful to work.
        // Also acts as NAT by ip-forwarding the requests from lambdas to the public internet.
        // Lambdas by themselves don't have public internet access as they are in private subnet.
        // The lambdas could not be placed in public subnet either as it would prevent RDS database access.
        // The standard solution for this is to use NAT Gateway which costs a lot of $$$$. The free tier solution
        // is to turn an EC2 instance into a NAT instance. We send all public-internet bound traffic
        // from service lambdas to this EC2 instance and the EC2 instance then forwards the requests to
        // the public internet by replacing the source IP with its own (stores the actual source IP in table).
        // When a response is returned, the EC2 instance checks the table and replaces the source IP with
        // the actual source IP.
        // This allows our lambdas to access the public internet as well as access the database.

        // This EC2 instance has been created from AWS console as creating it here would have been messy.
        // I had to create a NAT AMI first and then create an instance from that and then test it as well.
        // See the following docs for guide: https://docs.aws.amazon.com/vpc/latest/userguide/work-with-nat-instances.html
        // Fortunately, we only require public IP of EC2 to connect it with API Gateway for SSE.

        // UPDATE: The EC2 instance has been removed from cdk setup entirely because API Gateway doesn't support
        // a connection longer than 29 seconds. Therefore, the EC2 instance is now connected to by clients
        // directly. For that we have set up Nginx for reverse proxying and maintaining long-lived connections.
        // Also we've used Let's Encrypt for free SSL certificate so that we are able to make connection from
        // browser properly with no issues.
    }

    // Helper method to create service lambda functions.
    private createLambda(
        id: string,
        functionName: string,
        memorySize: number,
        timeout: cdk.Duration,
        entry: string,
        vpc: ec2.IVpc,
        subnets: ec2.ISubnet[],
        securityGroups: ec2.ISecurityGroup[]
    ): NodejsFunction {
        return new NodejsFunction(this, id, {
            functionName,
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize,
            timeout,
            entry,
            handler: 'handler',
            bundling: {
                minify: true,
                sourceMap: true,
                commandHooks: {
                    beforeBundling(): string[] {
                        return [];
                    },
                    beforeInstall(): string[] {
                        return [];
                    },
                    afterBundling(_inputDir: string, outputDir: string): string[] {
                        return [
                            `cp -R ../packages/database/generated ${outputDir}/`,
                        ];
                    },
                },
            },
            environment: getEnv(),
            vpc,
            vpcSubnets: {
                subnets,
            },
            securityGroups,
            allowPublicSubnet: false,
        });
    }
}
