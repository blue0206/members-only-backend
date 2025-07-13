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

        const authServiceLambda = new NodejsFunction(this, 'AuthServiceLambda', {
            functionName: 'auth-service',
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 256,
            timeout: cdk.Duration.seconds(25),
            entry: '../packages/auth-service/src/lambda.ts',
            handler: 'handler',
            bundling: {
                externalModules: [
                    '@aws-sdk/client-sqs',
                    'aws-sdk',
                    '@aws-sdk',
                    'mock-aws-s3',
                    'nock',
                ],
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
                subnets: [lambdaSubnetOne, lambdaSubnetTwo],
            },
            securityGroups: [lambdaSecurityGroup],
            allowPublicSubnet: false,
        });

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
    }
}
