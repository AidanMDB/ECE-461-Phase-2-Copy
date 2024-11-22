import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../functions/api-package-id/handler'; // Update path as per your project structure
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { SdkStreamMixin } from '@aws-sdk/types';

// Mock the DynamoDB client
const dynamoDBMock = mockClient(DynamoDBClient);
const s3Mock = mockClient(S3Client);

describe('Package API Handler', () => {
  beforeEach(() => {
    dynamoDBMock.reset();
    s3Mock.reset();
  });

  test('GET /package/{id} - Success (200)', async () => {
    jest.setTimeout(300000);

    const event: APIGatewayProxyEvent = {
      headers: { 'X-authorization': 'Bearer token' },
      body: JSON.stringify({ packageID: '123' }),
      pathParameters: ({ httpMethod: 'GET' }),
    } as any;

    const mockStream = Readable.from([
      JSON.stringify({
          Content: "UEsDBAoAAAAAACAfUFk...",
          JSProgram: 'a string',
      }),
  ]) as unknown as Readable & SdkStreamMixin;

    s3Mock.on(GetObjectCommand).resolves({ 
      Metadata: {
        Name: 'test package',
        Version: 'test version',
        ID: '123',
      },
      Body: mockStream
    });

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    console.log('result:', result);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      Metadata: {
        Name: 'test package',
        Version: 'test version',
        ID: '123',
      },
      Body: {
        Content: 'UEsDBAoAAAAAACAfUFk...', // Truncated content
        JSProgram: expect.any(String),
      },
    });
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

  test('GET /package/{id} - Missing ID (400)', async () => {
    const event: APIGatewayProxyEvent = {
        headers: { 'X-authorization': 'Bearer token' },
        body: ({}),
      } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("Unsupported method or missing fields.");
  });

  test('GET /package/{id} - Invalid ID (400)', async () => {
    const event: APIGatewayProxyEvent = {
        headers: { 'X-authorization': 'Bearer token' },
        body: ({ id: 'invalid-body' }),
      } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("Unsupported method or missing fields.");
  });

  test('GET /package/{id} - Package Not Found (404)', async () => {
    const event: APIGatewayProxyEvent = {
        headers: { 'X-authorization': 'Bearer token' },
        body: JSON.stringify({ packageID: '123' }),
        pathParameters: ({ httpMethod: 'GET' }),
      } as any;

    s3Mock.onAnyCommand().rejects({ name: "NotFound" });

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

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
