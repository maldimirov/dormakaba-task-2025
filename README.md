## Description

- uses serverless

## Setup

### 1. NPM

Install the project dependencies using

```bash
npm i
```

### 2. AWS

#### Using a credentials file

Setup your AWS credentials using this script

```bash
touch ~/.aws/credentials
echo "[default]" >> ~/.aws/credentials
echo "aws_access_key_id = <your access key id>" >> ~/.aws/credentials
echo "aws_secret_access_key = <your secret access key>" >> ~/.aws/credentials

```

Note that if you already have a credentials file, that might mess it up. So be careful when running the script.

#### Other

If you prefer another way refer to [the docs](https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html#credentialProviderChain).

### 3. Serverless

1. Create a free serverless account
2. Issue a new licence key
3. Run the login command using the licence key

```bash
sls login
```

## Run / Invoke

### 1. Deploy

In order to deploy the example, you need to run the following command:

```bash
sls deploy
```

### 2. Invoke

After successful deployment, you can invoke the deployed function by uploading the `publickey.cer` file located in the tools folder in this project to the `dormakaba-certificates-bucket` S3 bucket

```
serverless invoke --function hello
```

## Test

To run the tests use `npm test`
