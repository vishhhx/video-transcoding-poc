const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");
const { spawn } = require("node:child_process");

const ecsclient = new ECSClient({
  region: process.env.AWS_REGION,
});
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
});

const getTranscoderEnvironment = (key) => [
  { name: "BACKENDURL", value: process.env.BACKEND_URL },
  { name: "KEY", value: key },
  {
    name: "ORIGINALVIDEOBUCKETNAME",
    value: process.env.AWS_BUCKET_ORIGINAL_VIDEO,
  },
  {
    name: "TRANSCODEDVIDEOBUCKETNAME",
    value: process.env.AWS_BUCKET_TRANSCODED_VIDEO,
  },
  { name: "AWS_REGION", value: process.env.AWS_REGION },
  { name: "AWS_ACCESS_KEY_ID", value: process.env.AWS_ACCESS_KEY_ID },
  { name: "AWS_SECRET_ACCESS_KEY", value: process.env.AWS_SECRET_ACCESS_KEY },
];

const startLocalTranscoder = (key) => {
  if (typeof key !== "string" || !key.trim()) {
    throw new Error("SQS transcoding message does not contain a valid key");
  }

  const image = process.env.LOCAL_TRANSCODER_IMAGE || "video-transcoder:latest";
  const backendUrl =
    process.env.LOCAL_TRANSCODER_BACKEND_URL ||
    `http://host.docker.internal:${process.env.BACKEND_PORT || 5000}`;
  const dockerNetwork = process.env.LOCAL_TRANSCODER_NETWORK;
  const dockerArgs = ["run", "--rm"];

  if (dockerNetwork) {
    dockerArgs.push("--network", dockerNetwork);
  } else {
    dockerArgs.push("--add-host", "host.docker.internal:host-gateway");
  }

  dockerArgs.push(
    "--name",
    `video-transcoder-${key.replace(/[^a-zA-Z0-9_.-]/g, "-")}`,
    ...getTranscoderEnvironment(key)
      .map((environment) =>
        environment.name === "BACKENDURL"
          ? { ...environment, value: backendUrl }
          : environment,
      )
      .flatMap(({ name, value }) => ["-e", `${name}=${value}`]),
    image,
  );

  const child = spawn("docker", dockerArgs, { stdio: "inherit" });

  child.on("error", (error) => {
    console.error("Failed to start local transcoder:", error.message);
  });
  child.on("exit", (code, signal) => {
    if (code !== 0) {
      console.error(
        `Local transcoder exited with code ${code} (${signal || "no signal"})`,
      );
    }
  });
};

const parseTranscodingMessage = (body) => {
  const message = typeof body === "string" ? JSON.parse(body) : body;

  if (message?.key) {
    return { bucket: message.bucket, key: message.key };
  }

  if (message?.Message) {
    return parseTranscodingMessage(message.Message);
  }

  if (message?.body) {
    return parseTranscodingMessage(message.body);
  }

  const record = message?.Records?.[0];
  if (record?.s3?.object?.key) {
    return {
      bucket: record.s3.bucket?.name,
      key: decodeURIComponent(record.s3.object.key.replace(/\+/g, " ")),
    };
  }

  throw new Error("SQS transcoding message does not contain an S3 object key");
};

const startCloudTranscoder = async (key) => {
  const taskcommand = new RunTaskCommand({
    taskDefinition: process.env.AWS_ECS_TASK_DEFINATION,
    cluster: process.env.AWS_ECS_CLUSTER,
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: process.env.AWS_ECS_SUBNETS.split(","),
        securityGroups: process.env.AWS_ECS_SECURITY_GROUPS.split(","),
        assignPublicIp: "ENABLED",
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: process.env.AWS_ECS_CONTAINER_NAME || "video-transcoding",
          environment: getTranscoderEnvironment(key),
        },
      ],
    },
  });
  await ecsclient.send(taskcommand);
};

module.exports.transcoderConsumer = async () => {
  if (!process.env.SQS_QUEUE_URL) {
    throw new Error("SQS_QUEUE_URL is not configured");
  }

  const poll = async () => {
    while (true) {
      try {
        const response = await sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
            VisibilityTimeout: Number(
              process.env.SQS_VISIBILITY_TIMEOUT || 900,
            ),
          }),
        );

        for (const message of response.Messages || []) {
          try {
            const { key } = parseTranscodingMessage(message.Body);
            const mode = (process.env.DEPLOYMENT_MODE || "cloud").toLowerCase();

            if (mode === "cloud") {
              await startCloudTranscoder(key);
            } else if (mode === "hybrid") {
              startLocalTranscoder(key);
            } else {
              throw new Error(`Unsupported DEPLOYMENT_MODE: ${mode}`);
            }

            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: process.env.SQS_QUEUE_URL,
                ReceiptHandle: message.ReceiptHandle,
              }),
            );
          } catch (error) {
            console.error("Unable to dispatch SQS transcoding job:", error);
          }
        }
      } catch (error) {
        console.error("Unable to poll SQS transcoding queue:", error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  };

  poll().catch((error) => {
    console.error("SQS transcoder consumer stopped:", error);
  });
};
