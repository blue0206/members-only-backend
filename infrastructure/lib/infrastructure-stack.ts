import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apiGatewayV2 from 'aws-cdk-lib/aws-apigatewayv2';
import {
    HttpLambdaIntegration,
    HttpUrlIntegration,
} from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
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
                allowOrigins: [
                    'https://app.nevery.shop',
                    'https://cloud.nevery.shop',
                ],
            },
            defaultDomainMapping: {
                domainName,
            },
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
            [lambdaSecurityGroup],
            getEnv()
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
            [lambdaSecurityGroup],
            getEnv()
        );

        // User service lambda integration with API Gateway.
        const userLambdaIntegration = new HttpLambdaIntegration(
            'UserLambdaIntegration',
            userServiceLambda
        );

        // Setup user routes to trigger user lambda.
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
            [lambdaSecurityGroup],
            getEnv()
        );

        // Message service lambda integration with API Gateway.
        const messageLambdaIntegration = new HttpLambdaIntegration(
            'MessageLambdaIntegration',
            messageServiceLambda
        );

        // Setup message routes to trigger message lambda.
        httpApi.addRoutes({
            path: '/api/v1/messages/{proxy+}',
            methods: [apiGatewayV2.HttpMethod.ANY],
            integration: messageLambdaIntegration,
        });

        //--------------------------------SSE SERVICE + NAT EC2 INSTANCE--------------------------------

        const ec2PublicIp = '52.66.49.111';
        const sseServerPort = 8000;

        // Setup events routes. The requests on these routes are forwarded to SSE+NAT EC2 instance
        // by API Gateway.

        // Route for clients to set up SSE connection.
        const sseSetupEc2Integration = new HttpUrlIntegration(
            'SseSetupIntegration',
            `http://${ec2PublicIp}:${sseServerPort.toString()}/api/v1/events`,
            {
                method: apiGatewayV2.HttpMethod.GET,
            }
        );
        httpApi.addRoutes({
            path: '/api/v1/events',
            methods: [apiGatewayV2.HttpMethod.GET],
            integration: sseSetupEc2Integration,
        });

        // Route for SSE service healthcheck.
        const sseHealthcheckEc2Integration = new HttpUrlIntegration(
            'SseHealthcheckIntegration',
            `http://${ec2PublicIp}:${sseServerPort.toString()}/api/v1/events/healthcheck`,
            {
                method: apiGatewayV2.HttpMethod.GET,
            }
        );
        httpApi.addRoutes({
            path: '/api/v1/events/healthcheck',
            methods: [apiGatewayV2.HttpMethod.GET],
            integration: sseHealthcheckEc2Integration,
        });
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
        securityGroups: ec2.ISecurityGroup[],
        env?: Record<string, string>
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
            environment: env,
            vpc,
            vpcSubnets: {
                subnets,
            },
            securityGroups,
            allowPublicSubnet: false,
        });
    }
}
