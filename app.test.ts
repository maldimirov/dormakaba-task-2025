import { GetObjectCommandOutput, S3 } from '@aws-sdk/client-s3';
import { S3EventRecord } from 'aws-lambda';
import {
  init,
  getS3FileBody,
  parseS3CreateEvent,
  ParsedS3CreateEvent,
} from './app';

jest.mock('@aws-sdk/client-s3');

beforeEach(() => {});

describe('Parse S3 Create Event', () => {
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
});
