import { readFileSync } from 'fs';
import { GetObjectCommandOutput, S3 } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3EventRecord } from 'aws-lambda';
import { X509Certificate } from 'node:crypto';
import {
  init,
  getS3FileBody,
  parseS3CreateEvent,
  ParsedS3CreateEvent,
  extractCommonName,
  parseCertificate,
  generatePrivKey,
  signWithPrivKey,
  writeToDynamo,
  handler,
} from './app';

jest.mock('@aws-sdk/client-s3', () => {
  return {
    ...jest.requireActual('@aws-sdk/client-s3'),
    S3: jest.fn(),
  };
});
jest.mock('@aws-sdk/client-dynamodb', () => {
  return {
    ...jest.requireActual('@aws-sdk/client-dynamodb'),
    DynamoDBClient: jest.fn(),
  };
});

beforeEach(() => {});

const testS3record: S3EventRecord = {
  eventVersion: '2.0',
  eventSource: 'aws:s3',
  awsRegion: 'us-east-1',
  eventTime: '1970-01-01T00:00:00.000Z',
  eventName: 'ObjectCreated:Put',
  userIdentity: {
    principalId: 'EXAMPLE',
  },
  requestParameters: {
    sourceIPAddress: '127.0.0.1',
  },
  responseElements: {
    'x-amz-request-id': 'EXAMPLE123456789',
    'x-amz-id-2':
      'EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH',
  },
  s3: {
    s3SchemaVersion: '1.0',
    configurationId: 'testConfigRule',
    bucket: {
      name: 'certificates-bucket-serverless',
      ownerIdentity: {
        principalId: 'maldimirov',
      },
      arn: 'arn:aws:s3:::certificates-bucket-serverless',
    },
    object: {
      key: 'publickey.cer',
      size: 1400,
      eTag: '2d2d6c56e33e9ead6e35422badd43c61',
      sequencer: 'CRC64NVME',
    },
  },
};

const certificate = `-----BEGIN CERTIFICATE-----
MIIEBzCCAu+gAwIBAgIUXq/e7TyADGQwhl0Mzu4AWRGwvVAwDQYJKoZIhvcNAQEL
BQAwgZIxCzAJBgNVBAYTAkJHMRMwEQYDVQQIDApTb2ZpYS1DaXR5MQ4wDAYDVQQH
DAVTb2ZpYTEYMBYGA1UECgwPTWFyaW4gQWxkaW1pcm92MQswCQYDVQQLDAJNZTER
MA8GA1UEAwwIbWFuZGFyaW4xJDAiBgkqhkiG9w0BCQEWFW0uYWxkaW1pcm92QGdt
YWlsLmNvbTAeFw0yNTA4MDUxMTM5NDRaFw0zMDA4MDQxMTM5NDRaMIGSMQswCQYD
VQQGEwJCRzETMBEGA1UECAwKU29maWEtQ2l0eTEOMAwGA1UEBwwFU29maWExGDAW
BgNVBAoMD01hcmluIEFsZGltaXJvdjELMAkGA1UECwwCTWUxETAPBgNVBAMMCG1h
bmRhcmluMSQwIgYJKoZIhvcNAQkBFhVtLmFsZGltaXJvdkBnbWFpbC5jb20wggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQChK7VWf6GRdw8h3R/YNCrytqX2
v8pD6Ix5gBvRJM8mjTMkkAC33f91goCK74qIs019Yhc6nhg4Kbnnx25dltHwF7gg
Q3Y1vk8u/ZO8H0+MgS7VGXyFENbSld1BRQESgwBwMF5krMyBiKsiTIKQtLWaSA0o
6nC83n+uD2SuwJ9ir7sc0iskQKRsLPUJ0+xTUf5pxEJXRqJ2g0XSXmjzU6DJqleE
EUlaMWSralSF1USeMVqDbSQOg52EOHWToL+VpJ6Hm5K8OuwUmQSMleyxwQCH1rMt
Y3/YLkucDb3hiXOgfwYZUH9Mk0amncdxkLs5/eJ+6zdFWHGhGy2RDMpTQEh/AgMB
AAGjUzBRMB0GA1UdDgQWBBQQQrVkBG8bSwRbLs3ypF6nlJ5xPDAfBgNVHSMEGDAW
gBQQQrVkBG8bSwRbLs3ypF6nlJ5xPDAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3
DQEBCwUAA4IBAQCQZFFoVudYyMTTsNkIX9C9HVOmk75IAIUFheqNokyxL9LXaIFy
XIlTFkswjvIQBJnRMvGGl9Fxdb0HVCX+cXBz4s8lelOOWZW4S01VupDGFKWk8oKV
3r+A5Ng1iCEiV0Lf/+UjDw3veZwy68MoLRSMg1XGuwtj9B/ug0Vro2M2ZbQCT9T4
mgtz/aEtSzWrIEohX0czIy34pTM2i2HPUYJiebmiHH/ObbL/m8vSCeW+F4fckcAe
4sRxs9/U1/4+W11iE0OngNtIBfhze/QYNyp7GguC8pLuZlER5pVPyuCsovcu6rN3
LxkM06IkLLS6XJgQRUXT4rebKgJnnEQVlllT
-----END CERTIFICATE-----
`;

describe('Parse S3 Create Event', () => {
  it('fails when more than 1 record is provided', () => {
    expect(() =>
      parseS3CreateEvent({
        Records: [testS3record, testS3record],
      }),
    ).toThrow();
  });

  it('ok', () => {
    const parsedS3CreateEvent = parseS3CreateEvent({
      Records: [testS3record],
    });

    expect(parsedS3CreateEvent).not.toBeNull();
    expect(parsedS3CreateEvent.bucket).toEqual(
      'certificates-bucket-serverless',
    );
    expect(parsedS3CreateEvent.key).toEqual('publickey.cer');
  });
});

describe('getS3FileBody', () => {
  it('fails if getObject fails', async () => {
    S3.prototype.getObject = jest.fn(() =>
      Promise.reject(new Error(`getObject fail`)),
    );

    const parsedEvent: ParsedS3CreateEvent = {
      bucket: 'bucket1',
      key: 'key1',
    };

    init(); // remember to init() so updated mock is taken into account
    await expect(
      getS3FileBody(parsedEvent),
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  it('fails if body is empty', async () => {
    const res: GetObjectCommandOutput = {
      $metadata: {},
      Body: undefined,
    };
    S3.prototype.getObject = jest.fn(() => Promise.resolve(res));

    const parsedEvent: ParsedS3CreateEvent = {
      bucket: 'bucket1',
      key: 'key1',
    };

    init(); // remember to init() so updated mock is taken into account
    await expect(
      getS3FileBody(parsedEvent),
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  it('fails if body cannot transform to string', async () => {
    const res: any = {
      $metadata: {},
      Body: {
        transformToString: jest.fn(() =>
          Promise.reject(new Error(`transformToString fail`)),
        ),
      },
    };
    S3.prototype.getObject = jest.fn(() => Promise.resolve(res));

    const parsedEvent: ParsedS3CreateEvent = {
      bucket: 'bucket1',
      key: 'key1',
    };

    init(); // remember to init() so updated mock is taken into account
    await expect(
      getS3FileBody(parsedEvent),
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  it('ok', async () => {
    const res: any = {
      $metadata: {},
      Body: {
        transformToString: jest.fn(() => Promise.resolve(`the body`)),
      },
    };
    S3.prototype.getObject = jest.fn(() => Promise.resolve(res));

    const parsedEvent: ParsedS3CreateEvent = {
      bucket: 'bucket1',
      key: 'key1',
    };

    init(); // remember to init() so updated mock is taken into account
    await expect(getS3FileBody(parsedEvent)).resolves.toEqual(`the body`);
  });
});

describe('extractCommonName', () => {
  it('fails if cannot extract common name', () => {
    expect(() =>
      extractCommonName(`FL=1\nSL=2`),
    ).toThrowErrorMatchingSnapshot();
  });

  it('ok', () => {
    expect(extractCommonName(`FL=1\nCN=commonname\nSL=2`)).toEqual(
      `commonname`,
    );
  });
});

describe('parseCertificate', () => {
  it('ok', () => {
    const parsedCert = parseCertificate(certificate);
    expect(parsedCert.commonName).toEqual(`mandarin`);
    expect(parsedCert.pubKey).toMatchSnapshot();
  });
});

describe('generatePrivKey', () => {
  it('ok', () => {
    const privKey = generatePrivKey('rsa');
    expect(privKey).not.toBeNull();
    expect(privKey.length).toBeGreaterThan(0);
  });
});

describe('signWithPrivKey', () => {
  it('ok', () => {
    const privKey = generatePrivKey('rsa'); // relies on previous test
    const signedData = signWithPrivKey(privKey, 'data');

    expect(signedData).not.toBeNull();
    expect(signedData.length).toBeGreaterThan(0);
  });
});

describe('writeToDynamo', () => {
  process.env.DYNAMO_TABLE = 'dynamo_table';

  it('fails if dynamo write fails', async () => {
    DynamoDBClient.prototype.send = jest.fn(() =>
      Promise.reject(new Error('dynamo write failed')),
    );

    await expect(
      writeToDynamo('commonName', 'signedPubKey'),
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  it('ok', async () => {
    DynamoDBClient.prototype.send = jest.fn((command) => {
      expect(command).toMatchSnapshot();
      return Promise.resolve();
    });

    await expect(
      writeToDynamo('commonName', 'signedPubKey'),
    ).resolves.not.toThrow();
  });
});

describe.skip(`handler`, () => {
  // Set env vars
  process.env.DYNAMO_TABLE = 'dynamo_table';

  // MOCK S3
  const res: any = {
    $metadata: {},
    Body: {
      transformToString: jest.fn(() => Promise.resolve(certificate)),
    },
  };
  S3.prototype.getObject = jest.fn(() => Promise.resolve(res));

  // MOCK Dynamo
  DynamoDBClient.prototype.send = jest.fn((command) => {
    expect(command).toMatchSnapshot(); // the actual testing is done here!!!
    return Promise.resolve();
  });

  it(`handles as it should`, async () => {
    await expect(
      handler({
        Records: [testS3record],
      }),
    ).resolves.not.toThrow();
  });
});
