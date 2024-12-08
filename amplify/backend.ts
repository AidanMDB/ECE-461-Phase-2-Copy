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
import { myApiPackages } from './functions/api-package-list/resource.js';
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
  myApiPackages   // creates lambda
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


// create lambda integration
const lambdaIntegration = new LambdaIntegration(
  backend.myApiFunction.resources.lambda
);

const apiPackages = new LambdaIntegration(
  backend.myApiPackages.resources.lambda
)

// create new API path
const packagePath = myRestApi.root.addResource('package');

packagePath.addMethod('POST', lambdaIntegration, {

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