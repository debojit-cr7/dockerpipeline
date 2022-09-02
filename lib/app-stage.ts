import * as cdk from "@aws-cdk/core";
import { AppStack } from "./app-stack";

export class AppStage extends cdk.Stage {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    new AppStack(this, "AppStack");
  }
}