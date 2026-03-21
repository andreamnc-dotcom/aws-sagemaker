import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

const region = 'us-east-1';
const ssm = new SSMClient({ region });

async function getParam(name: string): Promise<string> {
  const r = await ssm.send(new GetParameterCommand({ Name: name }));
  return r.Parameter!.Value!;
}

let bucketName: string;
let queueUrl: string;
let s3: S3Client;
let sqs: SQSClient;

async function initAws() {
  bucketName = await getParam('/learner-lab/bucket-name');
  queueUrl = await getParam('/learner-lab/queue-url');
  s3 = new S3Client({ region });
  sqs = new SQSClient({ region });
  console.log('AWS config loaded:', bucketName, queueUrl);
}

app.post('/api/upload', express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
  try {
    const filename = req.query['filename'] as string;
    const key = `${Date.now()}-${filename}`;
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: req.body,
      ContentType: req.headers['content-type']
    }));
    res.json({ key });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/poll', async (req, res) => {
  try {
    const response = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 5,
      WaitTimeSeconds: 1
    }));

    const messages = response.Messages || [];

    for (const msg of messages) {
      await sqs.send(new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: msg.ReceiptHandle!
      }));
    }

    const results = messages.map(msg => {
      const body = JSON.parse(msg.Body!);
      return JSON.parse(body.Message);
    });

    res.json({ results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  initAws().then(() => {
    app.listen(port, (error) => {
      if (error) throw error;
      console.log(`Node Express server listening on http://localhost:${port}`);
    });
  });
}

export const reqHandler = createNodeRequestHandler(app);