import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({ region: 'us-east-1' });

async function getParameter(name: string): Promise<string> {
  const response = await ssm.send(new GetParameterCommand({ Name: name }));
  return response.Parameter!.Value!;
}

export async function getAwsConfig() {
  const [bucketName, queueUrl] = await Promise.all([
    getParameter('/learner-lab/bucket-name'),
    getParameter('/learner-lab/queue-url'),
  ]);

  return { bucketName, queueUrl, region: 'us-east-1' };
}