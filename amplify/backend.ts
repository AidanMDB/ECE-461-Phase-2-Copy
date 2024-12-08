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

import { ApiGateway } from 'aws-cdk-lib/aws-events-targets';
import { apiPackageRate } from './functions/api-package-id-rate/resource.js';
import { Stack } from 'aws-cdk-lib';
import { Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
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
    //allowHeaders: ["X-authorization"], // Specify only the headers you need to allow
  },
});


// cognito user pools authorizer
//const userPool = new UserPool(apiStack, "UserPool", "us-east-1_cwR5jLfKp");
//const cognitoAuth = new CognitoUserPoolsAuthorizer(apiStack, "CognitoAuth", {
//  cognitoUserPools: [backend.auth.resources.userPool],
//});
// const lambdaRole = new Role(apiStack, "LambdaExecutionRole", {
//   assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
//   managedPolicies: [
//     iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
//     iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"),
//   ],
// });

// create custom policy statement
// lambdaRole.addToPolicy(new PolicyStatement({
//   actions: [
//     'dynamodb:*',     // allow all dynamodb actions
//     's3:*',           // allow all s3 actions
//     'cognito-idp:*',  // allow all cognito actions
//     'logs:*',         // allow all logs actions
//     'events:*',       // allow all events actions
//     'sns:*',          // allow all sns actions (Publish, Subscribe, Unsubscribe)
//     'sqs:*',          // allow all sqs actions (SendMessage, ReceiveMessage, DeleteMessage)
//   ],
//   resources: ['*'],   // allow all resources
// }));


// create lambda integration for api package
const lambdaIntegration = new LambdaIntegration(
  backend.myApiFunction.resources.lambda
);

// create lambda integration for package rate
const lambdaIntegrationPackageRate = new LambdaIntegration(
  backend.apiPackageRate.resources.lambda
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


const apiPackages = new LambdaIntegration(
  backend.myApiPackages.resources.lambda
)

// add lambda integration for regex search api
const lambdaIntegrationRegex = new LambdaIntegration(
  backend.myApiFunctionRegex.resources.lambda
);

// create new API path for /packages
const packagesPath = myRestApi.root.addResource('packages');
packagesPath.addMethod('POST', apiPackages, {
});

// create new API path
const packagePath = myRestApi.root.addResource('package');
packagePath.addMethod('POST', lambdaIntegration, {
});

// create new API path for package rate
const packageRatePath = packagePath.addResource('{id}').addResource('rate');
packageRatePath.addMethod('GET', lambdaIntegrationPackageRate, {
});

// create new API path for api reset
const resetPath = myRestApi.root.addResource('reset');
resetPath.addMethod('DELETE', apiResetLambda, {
});

// create new API path for user register
const registerPath = myRestApi.root.addResource('register');
registerPath.addMethod('POST', lambdaIntegrationRegister, {
});

// create new API path for user authenticate
const authenticatePath = myRestApi.root.addResource('authenticate');
authenticatePath.addMethod('PUT', lambdaIntegrationAuthenticate, {
});

// create new API path for regex search
const regexPath = packagePath.addResource('byRegEx');
regexPath.addMethod('POST', lambdaIntegrationRegex, {
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