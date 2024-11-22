import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../functions/api-package-id/handler'; // Update path as per your project structure
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

// Mock the DynamoDB client
const dynamoDBMock = mockClient(DynamoDBClient);
const s3Mock = mockClient(S3Client);

describe('Package API Handler', () => {
  beforeEach(() => {
    dynamoDBMock.reset();
    s3Mock.reset();
  });

//   test('GET /package/{id} - Success (200)', async () => {
//     dynamoDBMock.onAnyCommand().resolves({
//       Item: {
//         ID: { S: 'underscore' },
//         Name: { S: 'Underscore' },
//         Version: { S: '1.0.0' },
//         Content: { S: 'UEsDBAoAAAAAACAfUFk...' }, // Truncated content
//       },
//     });

//     const event: APIGatewayProxyEvent = {
//       pathParameters: { id: 'underscore' },
//       headers: { 'X-Authorization': 'Bearer token' },
//     } as any;

//     const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

//     expect(result.statusCode).toBe(200);
//     expect(JSON.parse(result.body)).toEqual({
//       metadata: {
//         Name: 'Underscore',
//         Version: '1.0.0',
//         ID: 'underscore',
//       },
//       data: {
//         Content: 'UEsDBAoAAAAAACAfUFk...', // Truncated content
//         JSProgram: expect.any(String),
//       },
//     });
//   });

  test('GET /package/{id} - Missing ID (400)', async () => {
    const event: APIGatewayProxyEvent = {
        headers: { 'X-authorization': 'Bearer token' },
        body: ({ id: 'invalid-body' }),
      } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    // console.log(result);
    // console.log(result.body);
    // console.log(result.statusCode);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("Unsupported method or missing fields.");
  });

  test('GET /package/{id} - Unauthorized (403)', async () => {
    const event: APIGatewayProxyEvent = {
      headers: {},
      body: ({ id: 'underscore' }),
    } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(403);
    expect(result.body).toBe(JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken."));
  });

  test('GET /package/{id} - Package Not Found (404)', async () => {
    dynamoDBMock.onAnyCommand().resolves({});

    const event: APIGatewayProxyEvent = {
        headers: { 'X-authorization': 'Bearer token' },
        body: ({ id: 'invalid-body' }),
      } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    console.log(result);
    console.log(result.body);

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Package does not exist.');
  });

//   test('POST /package/{id} - Update Success (200)', async () => {
//     dynamoDBMock.onAnyCommand().resolves({
//       Attributes: {
//         ID: { S: 'underscore' },
//         Name: { S: 'Underscore' },
//         Version: { S: '1.0.1' },
//       },
//     });

//     const event: APIGatewayProxyEvent = {
//       pathParameters: { id: 'underscore' },
//       headers: { 'X-Authorization': 'Bearer token' },
//       body: JSON.stringify({
//         metadata: {
//           Name: 'Underscore',
//           Version: '1.0.1',
//         },
//         data: {
//           Content: 'UEsDBAoAAAAAACAfUFk...',
//         },
//       }),
//     } as any;

//     const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

//     expect(result.statusCode).toBe(200);
//     expect(JSON.parse(result.body).message).toBe('Version is updated.');
//   });

//   test('POST /package/{id} - Missing Fields (400)', async () => {
//     const event: APIGatewayProxyEvent = {
//       pathParameters: { id: 'underscore' },
//       headers: { 'X-Authorization': 'Bearer token' },
//       body: JSON.stringify({}),
//     } as any;

//     const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

//     expect(result.statusCode).toBe(200);
//     expect(JSON.parse(result.body).message).toBe('Invalid request body.');
//   });
});
