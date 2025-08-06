## Description

- uses serverless ??? does it still

## Setup

### 0. Prerequisites

In order to deploy and run this project you must have the following:

- Node.JS v22.x
- An active AWS account
- A IAM User with the rights to deploy infrastructure and run lambdas
- A pair of `Access Key ID` and `Secret Access Key` issued for that user
- AWS CLI installed
- AWS SAM CLI installed

### 1. NPM

Install the project dependencies using

```bash
npm i
```

### 2. Configure AWS credentials

Setup your AWS credentials using this script and fill the values when asked

```bash
 aws configure
```

#### Other authentication methods

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
