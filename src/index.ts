import { S3 } from '@aws-sdk/client-s3';
import { S3CreateEvent } from 'aws-lambda';
import { Certificate, X509Certificate } from 'node:crypto';

const s3 = new S3();

export type ParsedS3CreateEvent = {
  bucket: string;
  key: string;
};

export function parseS3CreateEvent(event: S3CreateEvent): ParsedS3CreateEvent {
  if (event.Records.length != 1) {
    throw new Error('Expected exactly 1 Record in the S3 Create Event');
  }
  const record = event.Records[0].s3;
  const bucket = record.bucket.name;
  const key = decodeURIComponent(record.object.key.replace(/\+/g, ' '));

  return {
    bucket,
    key,
  };
}

export async function getS3FileBody(
  parsedEvent: ParsedS3CreateEvent,
): Promise<string> {
  try {
    const { bucket, key } = parsedEvent;

    const res = await s3.getObject({
      Bucket: bucket,
      Key: key,
    });

    const body = await res.Body?.transformToString();
    if (!body) {
      throw new Error(
        `couldn't decode body for bucket ${bucket} and key ${key}`,
      );
    }

    return body;
  } catch (err) {
    throw new Error(`Failed to fetch S3 file: ${(err as Error).message}`);
  }
}

export function extractPubKey(certificate: string): string {
  const certBuffer = Buffer.from(certificate);

  if (!Certificate.verifySpkac(certBuffer)) {
    throw new Error('Invalid certificate format');
  }

  const pubKeyBuffer = Certificate.exportPublicKey(certBuffer);
  const challenge = Certificate.exportChallenge(certBuffer);

  const x509 = new X509Certificate(certBuffer);

  console.log('CHALLENGE', challenge);
  console.log('X509', x509);

  return pubKeyBuffer.toString();
}

export async function handleCertificate(event: S3CreateEvent) {
  const parsedEvent = parseS3CreateEvent(event);

  const certificate = await getS3FileBody(parsedEvent);
  console.log('CERTIFICATE:', certificate);

  const pubKey = extractPubKey(certificate);
  console.log('PUB KEY:', pubKey);
}

/** The actual lambda handler */
export const handler = async (event: S3CreateEvent) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  try {
    await handleCertificate(event);
  } catch (err) {
    console.log(err);
    if (err instanceof Error) {
      throw new Error(`Couldn't complete task: ${err.message}`);
    } else {
      throw new Error(
        "Something has failed terribly. We didn't even get a proper error!!!",
      );
    }
  }
};
