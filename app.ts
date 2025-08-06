import { S3 } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { S3CreateEvent } from 'aws-lambda';
import {
  X509Certificate,
  createPrivateKey,
  sign,
  KeyObject,
} from 'node:crypto';
import { promisify } from 'util';

const s3 = new S3();
const dynamo = new DynamoDBClient();
const DYNAMO_TABLE = process.env.DYNAMO_TABLE;

export type ParsedS3CreateEvent = {
  bucket: string;
  key: string;
};

export type ParsedCertificate = {
  pubKey: string;
  commonName: string;
};

/** Parses the S3 event and extracts bucket and obj key from */
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

/** Reads the body of an S3 file */
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

/** Extracts the Common Name from a x509 certificate Subject */
export function extractCommonName(x509Subject: string): string {
  const commonName = x509Subject
    .split('\n')
    .find((entry) => entry.startsWith('CN='));

  if (!commonName) {
    throw new Error('Could not extract CommonName from x509 Subject line');
  }

  return commonName;
}

/** Parses a x509 certificate and extracts the Public Key and Subject */
export function parseCertificate(certificate: string): ParsedCertificate {
  const certBuffer = Buffer.from(certificate);
  const x509 = new X509Certificate(certBuffer);
  const pubKey = x509.publicKey
    .export({ format: 'pem', type: 'pkcs1' })
    .toString();
  const commonName = extractCommonName(x509.subject);

  return {
    pubKey,
    commonName,
  };
}

/** Generates a Private Key based on the provided algorithm */
export function generatePrivKey(algorithm: 'rsa'): KeyObject {
  const privKey = createPrivateKey({
    key: '',
    type: 'pkcs8',
    format: 'pem',
  });

  // const { privateKey } = await generateKeyPairPromise(algorithm, {
  //   modulusLength: 4096,
  //   publicKeyEncoding: {
  //     type: 'spki',
  //     format: 'pem',
  //   },
  //   privateKeyEncoding: {
  //     type: 'pkcs8',
  //     format: 'pem',
  //     cipher: 'aes-256-cbc',
  //     passphrase: 'top secret',
  //   },
  // });

  return privKey;
}

export async function signWithPrivKey(
  privKey: KeyObject,
  payload: string,
): Promise<string> {
  // const signPromise = promisify(sign);

  // const signedPayload = await signPromise(null, Buffer.from(payload), privKey);
  const signedPayload = sign(null, Buffer.from(payload), privKey);

  return signedPayload.toString();
}

export async function writeToDynamo(
  commonName: string,
  signedPubKey: string,
): Promise<void> {
  const command = new PutItemCommand({
    TableName: DYNAMO_TABLE,
    Item: {
      commonName: { S: commonName },
      signedPubKey: { S: signedPubKey },
    },
  });

  await dynamo.send(command);
}

/** The actual lambda handler */
export const handler = async (event: S3CreateEvent) => {
  const parsedEvent = parseS3CreateEvent(event);
  const certificate = await getS3FileBody(parsedEvent);
  const parsedCert = parseCertificate(certificate);
  const privKey = generatePrivKey('rsa');
  console.log('PRIVATE KEY', privKey.export().toString());

  // const signedPubKey = await signWithPrivKey(privKey, parsedCert.pubKey);
  const signedPubKey = 'await signWithPrivKey(privKey, parsedCert.pubKey);';

  console.log('PARSED CERTIFICATE:', parsedCert);
  console.log('SIGNED PUB KEY:', signedPubKey);

  await writeToDynamo(parsedCert.commonName, signedPubKey);
};
