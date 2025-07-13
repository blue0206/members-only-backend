import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apiGatewayV2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
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

        //------------------------API Gateway--------------------------------

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

        const authServiceLambda = this.createServiceLambda(
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

        const userServiceLambda = this.createServiceLambda(
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
            path: '/api/v1/users/{proxy+}',
            methods: [apiGatewayV2.HttpMethod.ANY],
            integration: userLambdaIntegration,
        });
    }

    // Helper method to create service lambda functions.
    private createServiceLambda(
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
                banner: 'require("source-map-support").install();',
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
