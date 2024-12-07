import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RestApi,
  Model,
  JsonSchemaType
} from 'aws-cdk-lib/aws-apigateway';

import { myApiFunction } from './functions/api-function/resource.js';
import { myApiFunctionRegex } from './functions/api-package-regex/resource.js';
import { myApiFunctionRegister } from './functions/api-register/resource.js';
import { myApiFunctionAuthenticate } from './functions/api-authenticate/resource.js';
import { apiReset } from './functions/api-reset/resource.js';

import { ApiGateway } from 'aws-cdk-lib/aws-events-targets';
import { Stack } from 'aws-cdk-lib';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,           // creates cognito
  data,           // creates dynamodb
  storage,        // creates s3
  myApiFunction,  // creates lambda 
  myApiFunctionRegex, // creates lambda for regex search
  myApiFunctionRegister, // creates lambda for register
  myApiFunctionAuthenticate, // creates lambda for authenticate
  apiReset        // creates lambda
});

//const {} = backend.auth.resources.cfnResources;


// create API stack
const apiStack = backend.createStack('api-stack');

// create REST API
const myRestApi = new RestApi(apiStack, "RestApi", {
  restApiName: "Phase2Webapp-RestApi",
  deploy: true,
  deployOptions: {
    stageName: "dev",
  },
  defaultCorsPreflightOptions: {
    allowOrigins: ["https://main.dec29zvcbtyi8.amplifyapp.com/", "https://wdyoiqbu66.execute-api.us-east-1.amazonaws.com/dev/"], // Restrict this to domains you trust
    allowMethods: ["GET", "POST", "DELETE", "PUT"],
    //allowHeaders: ["X-authorization"], // Specify only the headers you need to allow
  },
});


// cognito user pools authorizer
//const userPool = new UserPool(apiStack, "UserPool", "us-east-1_cwR5jLfKp");
//const cognitoAuth = new CognitoUserPoolsAuthorizer(apiStack, "CognitoAuth", {
//  cognitoUserPools: [backend.auth.resources.userPool],
//});


// create lambda integration for api package
const lambdaIntegration = new LambdaIntegration(
  backend.myApiFunction.resources.lambda
);

// create lambda for api reset
const apiResetLambda = new LambdaIntegration(
  backend.apiReset.resources.lambda
);

// create lambda integration for user register
const lambdaIntegrationRegister = new LambdaIntegration(
  backend.myApiFunctionRegister.resources.lambda
);

// create lambda integration for user authenticate
const lambdaIntegrationAuthenticate = new LambdaIntegration(
  backend.myApiFunctionAuthenticate.resources.lambda
);


// create new API path
const packagePath = myRestApi.root.addResource('package');

packagePath.addMethod('POST', lambdaIntegration, {
  requestParameters: {
    "method.request.header.X-authorization": true,  // Requires 'X-authorization' header
  },
  requestModels: {'application/json': packageData},
  requestValidatorOptions: {
    validateRequestBody: true,
    validateRequestParameters: true
  }
});

// create new API path for api reset
const resetPath = myRestApi.root.addResource('reset');

resetPath.addMethod('DELETE', apiResetLambda, {
  requestParameters: {
    "method.request.header.X-authorization": true,  // Requires 'X-authorization' header
  },
  requestValidatorOptions: {
    validateRequestParameters: true
  }
});

// create new API path for user register
const registerPath = myRestApi.root.addResource('register');

registerPath.addMethod('POST', lambdaIntegrationRegister, {
  requestParameters: {
    "method.request.header.X-authorization": true,  // Requires 'X-authorization' header
  },
  requestModels: {'application/json': packageData},
  requestValidatorOptions: {
    validateRequestBody: true,
    validateRequestParameters: true
  }
});

// create new API path for user authenticate
const authenticatePath = myRestApi.root.addResource('authenticate');

authenticatePath.addMethod('POST', lambdaIntegrationAuthenticate, {
  requestParameters: {
    "method.request.header.X-authorization": true,  // Requires 'X-authorization' header
  },
  requestModels: {'application/json': packageData},
  requestValidatorOptions: {
    validateRequestBody: true,
    validateRequestParameters: true
  }
});

// I'm not sure what this does
packagePath.addProxy({
  anyMethod: false,
  defaultIntegration: lambdaIntegration
})

// add lambda integration for regex search api
const lambdaIntegrationRegex = new LambdaIntegration(
  backend.myApiFunctionRegex.resources.lambda
);

// create new API path for regex search
const regexPath = myRestApi.root.addResource('package').addResource('byRegEx');

regexPath.addMethod('POST', lambdaIntegrationRegex, {
  requestParameters: {
    "method.request.header.X-authorization": true,  // Requires 'X-authorization' header
  },
  requestModels: {'application/json': packageData},
  requestValidatorOptions: {
    validateRequestBody: true,
    validateRequestParameters: true
  }
});


// add outputs to the configuration files (should allow for the frontend and backend to call the API)
backend.addOutput({
  custom: {
    API: {
      [myRestApi.restApiName]: {
        endpoint: myRestApi.url,
        region: Stack.of(myRestApi).region,
        apiName: myRestApi.restApiName
      }
    }
  }
});