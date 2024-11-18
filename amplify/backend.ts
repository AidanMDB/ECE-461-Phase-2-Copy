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
import { apiPackageID } from './functions/api-package-id/resource.js';
import { ApiGateway } from 'aws-cdk-lib/aws-events-targets';
import { Stack } from 'aws-cdk-lib';

const backend = defineBackend({
  auth,           // creates cognito
  data,           // creates dynamodb
  storage,        // creates s3
  myApiFunction,  // creates lambda
  apiPackageID    // creates lambda
});

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
    allowOrigins: Cors.ALL_ORIGINS, // Restrict this to domains you trust
    allowMethods: Cors.ALL_METHODS, // Specify only the methods you need to allow
    allowHeaders: Cors.DEFAULT_HEADERS, // Specify only the headers you need to allow
  },
});




// creates PackageData model from the API reference
const packageData: Model = myRestApi.addModel('PackageData', {
  schema: {
    type: JsonSchemaType.OBJECT,
    properties: {
      Name: {
        type: JsonSchemaType.STRING
      },
      Content: {
        type: JsonSchemaType.STRING
      },
      URL: {
        type: JsonSchemaType.STRING
      },
      Debloat: {
        type: JsonSchemaType.BOOLEAN
      },
      JSProgram: {
        type: JsonSchemaType.STRING
      }
    },
    required: ["JSProgram", "Debloat", "Name"], // should name be required???
    oneOf: [{required: ["Content"]}, {required: ["URL"]}]
  }
});

// creates PackageID model from the API reference for POST
const packageID: Model = myRestApi.addModel('PackageID', {
  schema: {
    type: JsonSchemaType.OBJECT,
    properties: {
      metadata: {
        type: JsonSchemaType.OBJECT,
        properties: {
          Name: { type: JsonSchemaType.STRING },
          Version: { type: JsonSchemaType.STRING },
          ID: { type: JsonSchemaType.STRING }
        },
        required: ["Name", "Version", "ID"]
      },
      data: {
        type: JsonSchemaType.OBJECT,
        properties: {
          Name: { type: JsonSchemaType.STRING },
          Content: { type: JsonSchemaType.STRING },
          URL: { type: JsonSchemaType.STRING },
          debloat: { type: JsonSchemaType.BOOLEAN },
          JSProgram: { type: JsonSchemaType.STRING }
        },
        required: ["JSProgram", "Debloat", "Name"], // should name be required???
        oneOf: [{required: ["Content"]}, {required: ["URL"]}]
      }
    },
    required: ["metadata", "data"]
  }
});


// create lambda integration
const lambdaIntegration = new LambdaIntegration(
  backend.myApiFunction.resources.lambda
);

const lamddaIntegrationPackageID = new LambdaIntegration(
  backend.apiPackageID.resources.lambda
)

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

packagePath.addProxy({
  anyMethod: false,
  defaultIntegration: lambdaIntegration
})

packagePath.addResource('{id}').addMethod('GET', lamddaIntegrationPackageID, {
  requestParameters: {
    "method.request.header.X-authorization": true,  // Requires 'X-authorization' header
  },
  requestValidatorOptions: {
    validateRequestParameters: true
  }
});

packagePath.addResource('{id}').addMethod('POST', lamddaIntegrationPackageID, {
  requestParameters: {
    "method.request.header.X-authorization": true,  // Requires 'X-authorization' header
  },
  requestModels: {'application/json': packageID},
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
})