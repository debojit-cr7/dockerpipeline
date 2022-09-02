#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();
new PipelineStack(app, 'CdkPipelineDocker');