import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({
  region: process.env.AWS_REGION,
});

export const handler = async (event) => {
  try {
    if (!process.env.SQS_QUEUE_URL) {
      throw new Error("SQS_QUEUE_URL is not configured");
    }

    await Promise.all(
      event.Records.map((record) => {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(
          record.s3.object.key.replace(/\+/g, " "),
        );

        return sqs.send(
          new SendMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MessageBody: JSON.stringify({ bucket, key }),
          }),
        );
      }),
    );
  } catch (error) {
    console.error("Error sending video job to SQS", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "SQS Error", detail: error.message }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ status: "OK" }),
  };
};
