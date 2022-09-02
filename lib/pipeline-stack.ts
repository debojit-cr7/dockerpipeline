import * as cdk from "@aws-cdk/core";
import { Artifact } from "@aws-cdk/aws-codepipeline";
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";
import { GitHubSourceAction } from "@aws-cdk/aws-codepipeline-actions";
import { AppStage } from "./app-stage";

export class PipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const sourceArtifact = new Artifact();
    const cloudAssemblyArtifact = new Artifact();

    // clone repo from GtiHub using token from secrets manager
    const sourceAction = new GitHubSourceAction({
      actionName: "GitHubSource",
      output: sourceArtifact,
      oauthToken: cdk.SecretValue.secretsManager("github-token"),
      owner: "debojit-cr7",
      repo: "dockerpipeline",
      branch: "main",
    });

    // will run yarn install --frozen-lockfile, and then the buildCommand
    const synthAction = SimpleSynthAction.standardYarnSynth({
      sourceArtifact,
      cloudAssemblyArtifact,
      buildCommand: "yarn build",
    });

    const pipeline = new CdkPipeline(this, "Pipeline", {
      cloudAssemblyArtifact,
      sourceAction,
      synthAction,
    });

    const app = new AppStage(this, "Dev");
    
    pipeline.addApplicationStage(app);
  }
}