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
import { myApiFunctionRegex } from './functions/api-package-regex/resource.js';
import { myApiFunctionRegister } from './functions/api-register/resource.js';
import { myApiFunctionAuthenticate } from './functions/api-authenticate/resource.js';
import { apiReset } from './functions/api-reset/resource.js';
import { myApiFunctionTracks } from './functions/api-tracks/resource.js';

import { ApiGateway } from 'aws-cdk-lib/aws-events-targets';
import { apiPackageRate } from './functions/api-package-id-rate/resource.js';
import { aws_iam, Stack } from 'aws-cdk-lib';
import { Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { r } from 'tar';

const backend = defineBackend({
  auth,           // creates cognito
  data,           // creates dynamodb
  storage,        // creates s3
  myApiFunction,  // creates lambda
  myApiPackages,   // creates lambda
  myApiFunctionRegex, // creates lambda for regex search
  myApiFunctionRegister, // creates lambda for register
  myApiFunctionAuthenticate, // creates lambda for authenticate
  apiReset,        // creates lambda
  apiPackageRate, // creates lambda
  myApiFunctionTracks, // creates lambda
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
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: ["GET", "POST", "DELETE", "PUT"],
    allowHeaders: Cors.DEFAULT_HEADERS, // Specify only the headers you need to allow
  },
});


// cognito user pools authorizer
//const userPool = new UserPool(apiStack, "UserPool", "us-east-1_cwR5jLfKp");
//const cognitoAuth = new CognitoUserPoolsAuthorizer(apiStack, "CognitoAuth", {
//  cognitoUserPools: [backend.auth.resources.userPool],
//});
const lambdaRole = new Role(apiStack, "LambdaExecutionRole", {
  assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
    iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"),
  ],
});

// create custom policy statement
lambdaRole.addToPolicy(new PolicyStatement({
  actions: [
    'dynamodb:*',     // allow all dynamodb actions
    's3:*',           // allow all s3 actions
    'cognito-idp:*',  // allow all cognito actions
    'logs:*',         // allow all logs actions
    'events:*',       // allow all events actions
    'sns:*',          // allow all sns actions (Publish, Subscribe, Unsubscribe)
    'sqs:*',          // allow all sqs actions (SendMessage, ReceiveMessage, DeleteMessage)
  ],
  resources: ['*'],   // allow all resources
}));

// PREVIOUS VERSION FOR LAMBDA INTEGRATION

// create lambda integration for api package
const myapifunction = new LambdaIntegration(
  backend.myApiFunction.resources.lambda
);

// create lambda integration for package rate
const myapiPackageIDRateFunction = new LambdaIntegration(
  backend.apiPackageRate.resources.lambda
);

// create lambda for api reset
const myapiResetFunction = new LambdaIntegration(
  backend.apiReset.resources.lambda
);

// create lambda integration for user register
const myapiRegisterFunction = new LambdaIntegration(
  backend.myApiFunctionRegister.resources.lambda
);

// create lambda integration for user authenticate
const myapiAuthenticateFunction = new LambdaIntegration(
  backend.myApiFunctionAuthenticate.resources.lambda
);


const myapiPackagesFunction = new LambdaIntegration(
  backend.myApiPackages.resources.lambda
)

// add lambda integration for regex search api
const myapiPackageByRegexFunction = new LambdaIntegration(
  backend.myApiFunctionRegex.resources.lambda
);

// add lambda integration for tracks api
const myapiTracksFunction = new LambdaIntegration(
  backend.myApiFunctionTracks.resources.lambda
);


// Create Lambda functions and associate them with the IAM role
/* const myApiFunctionLambda = new Function(apiStack, 'MyApiFunctionLambda', {
  runtime: Runtime.NODEJS_20_X,
  handler: 'handler.handler', // Ensure this matches the entry point of your Lambda function
  code: Code.fromAsset('amplify/functions/api-function'), // Update the path to your function
  role: lambdaRole,
});

const myApiPackagesLambda = new Function(apiStack, 'MyApiPackagesLambda', {
  runtime: Runtime.NODEJS_20_X,
  handler: 'handler.handler', // Ensure this matches the entry point of your Lambda function
  code: Code.fromAsset('amplify/functions/api-package-list'), // Update the path to your function
  role: lambdaRole,
});

const myApiFunctionRegexLambda = new Function(apiStack, 'MyApiFunctionRegexLambda', {
  runtime: Runtime.NODEJS_20_X,
  handler: 'handler.handler', // Ensure this matches the entry point of your Lambda function
  code: Code.fromAsset('amplify/functions/api-package-regex'), // Update the path to your function
  role: lambdaRole,
});

const myApiFunctionRegisterLambda = new Function(apiStack, 'MyApiFunctionRegisterLambda', {
  runtime: Runtime.NODEJS_20_X,
  handler: 'handler.handler', // Ensure this matches the entry point of your Lambda function
  code: Code.fromAsset('amplify/functions/api-register'), // Update the path to your function
  role: lambdaRole,
});

const myApiFunctionAuthenticateLambda = new Function(apiStack, 'MyApiFunctionAuthenticateLambda', {
  runtime: Runtime.NODEJS_20_X,
  handler: 'handler.handler', // Ensure this matches the entry point of your Lambda function
  code: Code.fromAsset('amplify/functions/api-authenticate'), // Update the path to your function
  role: lambdaRole,
});

const apiResetLambda = new Function(apiStack, 'ApiResetLambda', {
  runtime: Runtime.NODEJS_20_X,
  handler: 'handler.handler', // Ensure this matches the entry point of your Lambda function
  code: Code.fromAsset('amplify/functions/api-reset'), // Update the path to your function
  role: lambdaRole,
});

const apiPackageRateLambda = new Function(apiStack, 'ApiPackageRateLambda', {
  runtime: Runtime.NODEJS_20_X,
  handler: 'handler.handler', // Ensure this matches the entry point of your Lambda function
  code: Code.fromAsset('amplify/functions/api-package-id-rate'), // Update the path to your function
  role: lambdaRole,
}); */

// Create Lambda integrations
/* const lambdaIntegration = new LambdaIntegration(myApiFunctionLambda);

const lambdaIntegrationPackageRate = new LambdaIntegration(apiPackageRateLambda);

const apiResetLambdaIntegration = new LambdaIntegration(apiResetLambda);

const lambdaIntegrationRegister = new LambdaIntegration(myApiFunctionRegisterLambda);

const lambdaIntegrationAuthenticate = new LambdaIntegration(myApiFunctionAuthenticateLambda);

const apiPackagesIntegration = new LambdaIntegration(myApiPackagesLambda);

const lambdaIntegrationRegex = new LambdaIntegration(myApiFunctionRegexLambda); */


// create new API path for /packages
const packagesPath = myRestApi.root.addResource('packages');
packagesPath.addMethod('POST', myapiPackagesFunction, {
  authorizationType: AuthorizationType.NONE,

});

// create new API path
const packagePath = myRestApi.root.addResource('package');
packagePath.addMethod('POST', myapifunction, {
  authorizationType: AuthorizationType.NONE,
});

// create new API path for package rate
const packageRatePath = packagePath.addResource('{id}').addResource('rate');
packageRatePath.addMethod('GET', myapiPackageIDRateFunction, {
  authorizationType: AuthorizationType.NONE,
});

// create new API path for api reset
const resetPath = myRestApi.root.addResource('reset');
resetPath.addMethod('DELETE', myapiResetFunction, {
  authorizationType: AuthorizationType.NONE,
});

// create new API path for user register
const registerPath = myRestApi.root.addResource('register');
registerPath.addMethod('POST', myapiRegisterFunction, {
  authorizationType: AuthorizationType.NONE,
});

// create new API path for user authenticate
const authenticatePath = myRestApi.root.addResource('authenticate');
authenticatePath.addMethod('PUT', myapiAuthenticateFunction, {
  authorizationType: AuthorizationType.NONE,
});

// create new API path for regex search
const regexPath = packagePath.addResource('byRegEx');
regexPath.addMethod('POST', myapiPackageByRegexFunction, {
  authorizationType: AuthorizationType.NONE,
});

// create new API path for tracks
const tracksPath = myRestApi.root.addResource('tracks');
tracksPath.addMethod('GET', myapiTracksFunction, {
  authorizationType: AuthorizationType.NONE,
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