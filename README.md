## Description

This project uses serverless to build and delpoy a lambda function.

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

1. Create a free serverless account and issue a new license key
2. Or use this one `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdJZCI6IjVkNzVkYTBiLWM5ZjctNDEzMy05OTkzLTcyZGMxOWUwZGNlMSIsImlhdCI6MTc1NDMxNjExMywiZXhwIjoxNzg1ODUyMTEzLCJpc3MiOiJhcHAuc2VydmVybGVzcy5jb20ifQ.QPcOWlmHgYGQeVxagqZ6CC4sIpKOJB3Ku3HgpTYCzAJySp6LOhudoHzkQDjkeZtFNrff8LdlyTQKxqJjjlhTc92AL8H7niinH-fZ7bUBxjxIoQ9tfo8WPrIGgQnp-y_k12LpXqQV0247aZZynyt0gvdPp-zPaGAMqsyq0jVljlvS_45yIYYmIMf4bHklH-XtNMQw5ZldttVzbFOISX7xI1epW0rmO1ea06ZPD8ptlqv4Z04bOYW3ka0X_3UKGyNIK_gvHjoB0rFgooivlArJMklQOovAgMUODR4b-2FFjtELhhb-rXu27bXASk8hukkIkil_gOBalx1_y9DsPcNS1w`
3. Run the login command using the licence key

```bash
npm run login
```

## Run / Invoke

### Deploy

In order to deploy the example, you need to run the following command:

```bash
npm run deploy
```

### Invoke

After successful deployment, you can invoke the deployed function by uploading the `publickey.cer` file located in the tools folder in this project to the `dormakaba-certificates-bucket` S3 bucket. That should automatically trigger the lambda execution.

### Run locally

To run locally you still need the `publickey.cer` uploaded to the S3 bucket.
Trigger the function locally using
```bash
npm run invoke:local
```

## Test

To run the tests use `npm test`
