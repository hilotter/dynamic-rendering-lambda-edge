#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { DynamicRenderingLambdaEdgeStack } from '../lib/dynamic-rendering-lambda-edge-stack'

const app = new cdk.App();

new DynamicRenderingLambdaEdgeStack(app, 'DynamicRenderingLambdaEdgeStack', {
  env: {
    region: 'us-east-1',
  }
})
