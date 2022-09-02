import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as ecrAssets from "@aws-cdk/aws-ecr-assets";

export class AppStack extends cdk.Stack {
  public readonly redisLoadBalancerDNS: cdk.CfnOutput;
  public readonly appLoadBalancerDNS: cdk.CfnOutput;

  public readonly redisPort: number = 6379;
  public readonly appPort: number = 8080;
  public readonly cloudMapNamespace: string = "service.internal";
  public readonly redisServiceUrl: string = "redis://redis.service.internal:6379";

  constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "AppVPC", {
      maxAzs: 2,
    });

    const cluster = new ecs.Cluster(this, "ServiceCluster", { vpc });

    cluster.addDefaultCloudMapNamespace({ name: this.cloudMapNamespace });

    const appService = this.createAppService(cluster);

    const redisService = this.createRedisService(cluster, appService);

    this.appLoadBalancerDNS = new cdk.CfnOutput(this, "AppLoadBalancerDNS", {
      value: appService.loadBalancer.loadBalancerDnsName,
    });

    this.redisLoadBalancerDNS = new cdk.CfnOutput(
      this,
      "RedisLoadBalancerDNS",
      {
        value: redisService.loadBalancer.loadBalancerDnsName,
      }
    );
  }

  private createAppService(cluster: ecs.Cluster) {
    const appAsset = new ecrAssets.DockerImageAsset(this, "app", {
      directory: "./app",
      file: "Dockerfile",
    });

    const appTask = new ecs.FargateTaskDefinition(this, "app-task", {
      cpu: 512,
      memoryLimitMiB: 2048,
    });

    appTask
      .addContainer("app", {
        image: ecs.ContainerImage.fromDockerImageAsset(appAsset),
        essential: true,
        environment: { REDIS_URL: this.redisServiceUrl },
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: "AppContainer",
          logRetention: logs.RetentionDays.ONE_DAY,
        }),
      })
      .addPortMappings({ containerPort: this.appPort, hostPort: this.appPort });

    const appService = new ecsPatterns.NetworkLoadBalancedFargateService(
      this,
      "app-service",
      {
        cluster,
        cloudMapOptions: {
          name: "app",
        },
        cpu: 512,
        desiredCount: 1,
        taskDefinition: appTask,
        memoryLimitMiB: 2048,
        listenerPort: 80,
        publicLoadBalancer: true,
      }
    );

    appService.service.connections.allowFromAnyIpv4(
      ec2.Port.tcp(this.appPort),
      "app-inbound"
    );

    return appService;
  }

  private createRedisService(
    cluster: ecs.Cluster,
    appService: ecsPatterns.NetworkLoadBalancedFargateService
  ) {
    const redisTask = new ecs.FargateTaskDefinition(this, "redis-task", {
      cpu: 512,
      memoryLimitMiB: 2048,
    });

    redisTask
      .addContainer("redis", {
        image: ecs.ContainerImage.fromRegistry("redis:alpine"),
        essential: true,
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: "RedisContainer",
          logRetention: logs.RetentionDays.ONE_DAY,
        }),
      })
      .addPortMappings({
        containerPort: this.redisPort,
        hostPort: this.redisPort,
      });

    const redisService = new ecsPatterns.NetworkLoadBalancedFargateService(
      this,
      "redis-service",
      {
        cluster,
        cloudMapOptions: {
          name: "redis",
        },
        cpu: 512,
        desiredCount: 1,
        taskDefinition: redisTask,
        memoryLimitMiB: 2048,
        listenerPort: this.redisPort,
        publicLoadBalancer: false,
      }
    );

    redisService.service.connections.allowFrom(
      appService.service,
      ec2.Port.tcp(this.redisPort)
    );

    return redisService;
  }
}