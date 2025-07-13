import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apiGatewayV2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { DomainName } from 'aws-cdk-lib/aws-apigatewayv2';

export class InfrastructureStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

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
    }
}
