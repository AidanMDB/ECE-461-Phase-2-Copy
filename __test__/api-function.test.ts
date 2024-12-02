import { handler } from '../amplify/functions/api-function/handler';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, HeadObjectCommand} from '@aws-sdk/client-s3';
//import axios from 'axios';
import { calcMetrics } from '../amplify/functions/api-function/metrics_src/api-metric-caller';
import { mock } from 'node:test';
import { read } from 'node:fs';
import * as fs from 'fs';

const dynamoDBMock = mockClient(DynamoDBClient);
const s3Mock = mockClient(S3Client);
jest.mock('../amplify/functions/api-function/metrics_src/api-metric-caller', () => ({
  calcMetrics: jest.fn()
}));
//jest.mock('axios');

describe('Lambda Function Handler', () => {
  //const repoURL = 'https://github.com/user/repo';
  const mockcalcMetrics = calcMetrics as jest.Mock;
  const mockResult = JSON.stringify({});
  mockcalcMetrics.mockResolvedValue(mockResult);

  beforeEach(() => {
    jest.clearAllMocks();
    dynamoDBMock.reset();
    s3Mock.reset();
  });

  it('should return 403 error for missing X-authorization header', async () => {

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        Content: 'content',
        URL: 'url',
        JSProgram: 'jsprogram',
        debloat: false,
        Name: 'name'
      })
    } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(403);
    expect(result.body).toBe(JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken."));
  });


  it('should return 400 error for having URL and Content', async () => {
    const mockCalcMetricsResult = `{
      "URL": "https://github.com/nullivex/nodist",
      "NetScore": 0.9,
      "NetScore_Latency": 0.033,
      "RampUp": 0.5,
      "RampUp_Latency": 0.023,
      "Correctness": 0.7,
      "Correctness_Latency": 0.005,
      "BusFactor": 0.3,
      "BusFactor_Latency": 0.002,
      "ResponsiveMaintainer": 0.4,
      "ResponsiveMaintainer_Latency": 0.002,
      "License": 1,
      "License_Latency": 0.001
    }`;

    const event: APIGatewayProxyEvent = {
      headers: {
        'X-authorization': 'your-auth-token', // Add your X-authorization header here
      },
      body: JSON.stringify({
        Content: 'content',
        URL: 'url',
        JSProgram: 'jsprogram',
        debloat: false,
        Name: 'name'
      })
    } as any;

    mockcalcMetrics.mockResolvedValue(mockCalcMetricsResult);

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify('There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)'));
  });


  it ('should return 400 error for not missing fields', async () => {
    s3Mock.on(HeadObjectCommand).resolves({});

    const event: APIGatewayProxyEvent = {
      headers: {
        'X-authorization': 'your-auth-token', // Add your X-authorization header here
      },
      body: JSON.stringify({
        Content: 'content',
        JSProgram: 'jsprogram',
      })
    } as any;
  
    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;
    
    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify('There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)'));
  });

  it('should return 409 for existing package', async () => {

    const event: APIGatewayProxyEvent = {
      headers: {
        'X-authorization': 'your-auth-token', // Add your X-authorization header here
      },
      body: JSON.stringify({
        Content: fs.readFileSync('braces.zip'),
        JSProgram: 'jsprogram',
        debloat: false,
        Name: 'name'
      })
    } as any;

    s3Mock.on(HeadObjectCommand).resolves({});

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(409);
    expect(result.body).toBe(JSON.stringify('Package exists already'));
  });
});