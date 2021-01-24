import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import * as certmgr from '@aws-cdk/aws-certificatemanager'
import * as s3 from '@aws-cdk/aws-s3'
import * as crypto from 'crypto'
import * as fs from 'fs'

export class DynamicRenderingLambdaEdgeStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const currentDate = new Date().toISOString()

    // lambda@edge
    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-lambda-at-edge
    const viewerRequestEntryPath = 'src/lambda/handlers/viewer_request/index.ts'
    const viewerRequestLambda = new NodejsFunction(
      this,
      'DynamicRenderingViewerRequest',
      {
        functionName: 'DynamicRenderingViewerRequest',
        entry: viewerRequestEntryPath,
        description: `Generated on: ${currentDate}`,
        runtime: lambda.Runtime.NODEJS_12_X,
        timeout: cdk.Duration.seconds(5),
      }
    )
    const viewerRequestBuf = fs.readFileSync(viewerRequestEntryPath);
    const viewerRequestHash = crypto.createHash('sha256').update(viewerRequestBuf).digest('hex');
    const viewerRequestVersion = viewerRequestLambda.addVersion(viewerRequestHash)

    const originRequestEntryPath = 'src/lambda/handlers/origin_request/index.ts'
    const originRequestLambda = new NodejsFunction(
      this,
      'DynamicRenderingOriginRequest',
      {
        functionName: 'DynamicRenderingOriginRequest',
        entry: originRequestEntryPath,
        description: `Generated on: ${currentDate}`,
        runtime: lambda.Runtime.NODEJS_12_X,
        timeout: cdk.Duration.seconds(30),
        bundling: {
          sourceMap: true,
          define: {
            // https://esbuild.github.io/api/#defines
            // https://github.com/aws/aws-cdk/blob/v1.85.0/packages/@aws-cdk/aws-lambda-nodejs/lib/bundling.ts#L151
            'process.env.DYNAMIC_RENDERING_API_URL': `\\"${process.env.DYNAMIC_RENDERING_API_URL || ''}\\"`,
            'process.env.DYNAMIC_RENDERING_API_KEY': `\\"${process.env.DYNAMIC_RENDERING_API_KEY || ''}\\"`,
          },
        },
      }
    )

    const originRequestBuf = fs.readFileSync(originRequestEntryPath);
    const originRequestHash = crypto.createHash('sha256').update(originRequestBuf).digest('hex');
    const originRequestVersion = originRequestLambda.addVersion(originRequestHash)

    // cloudfront
    const certArn = process.env.ACM_CERT_ARN
    if (!certArn) {
      throw new Error('require ACM_CERT_ARN')
    }
    const domainNames = process.env.DOMAIN_NAMES
    if (!domainNames) {
      throw new Error('require DOMAIN_NAMES')
    }
    const bucketName = process.env.S3_BUCKET_NAME
    if (!bucketName) {
      throw new Error('require S3_BUCKET_NAME')
    }

    const certificate = certmgr.Certificate.fromCertificateArn(
      this,
      'Certificate',
      certArn
    )

    // SPA site setting
    const s3bucket = new s3.Bucket(this, "S3StaticWebsiteBucket", {
      bucketName,
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
    });

    new cloudfront.CloudFrontWebDistribution(
      this,
      `Distribution`,
      {
        defaultRootObject: '',
        priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
        originConfigs: [
          {
            customOriginSource: {
              originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
              domainName: s3bucket.bucketWebsiteDomainName,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
                allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD,
                forwardedValues: {
                  queryString: false,
                  headers: ['Host', 'Origin', 'x-need-dynamic-render'],
                },
                compress: true,
                lambdaFunctionAssociations: [
                  {
                    eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
                    lambdaFunction: viewerRequestVersion,
                  },
                  {
                    eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                    lambdaFunction: originRequestVersion,
                  },
                ]
              },
            ],
          },
        ],
        errorConfigurations: [
          {
            errorCode: 403,
            errorCachingMinTtl: 300,
            responseCode: 200,
            responsePagePath: '/index.html',
          }
        ],
        viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(
          certificate,
          {
            aliases: domainNames.split(','),
          }
        ),
      }
    )
  }
}
