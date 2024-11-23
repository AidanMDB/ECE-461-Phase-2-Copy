import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../functions/api-package-id/handler'; // Update path as per your project structure
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { SdkStreamMixin } from '@aws-sdk/types';

// Mock the DynamoDB and S3 client
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
      pathParameters: ({ httpMethod: 'GET' }),
    } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(403);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("Authentication failed due to invalid or missing AuthenticationToken.");
  });

  test('GET /package/{id} - Missing ID (400)', async () => {
    const event: APIGatewayProxyEvent = {
        headers: { 'X-authorization': 'Bearer token' },
        body: ({}),
        pathParameters: ({ httpMethod: 'GET' }),
      } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    console.log('result:', result);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("There is missing field(s) in the PackageData or it is formed improperly, or is invalid.");
  });

  test('GET /package/{id} - Invalid ID (400)', async () => {
    const event: APIGatewayProxyEvent = {
        headers: { 'X-authorization': 'Bearer token' },
        body: ({ id: 'invalid-body' }),
        pathParameters: ({ httpMethod: 'GET' }),
      } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    console.log('result:', result);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("There is missing field(s) in the PackageData or it is formed improperly, or is invalid.");
  });

  test('GET /package/{id} - Package Not Found (404)', async () => {
    const event: APIGatewayProxyEvent = {
        headers: { 'X-authorization': 'Bearer token' },
        body: JSON.stringify({ packageID: '123' }),
        pathParameters: ({ httpMethod: 'GET' }),
      } as any;

    s3Mock.on(GetObjectCommand).rejects({ name: "NoSuchKey" });

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Package does not exist.');
  });

  test('GET /package/{id} - Error checking for package (500)', async () => {
    const event: APIGatewayProxyEvent = {
        headers: { 'X-authorization': 'Bearer token' },
        body: JSON.stringify({ packageID: '123' }),
        pathParameters: ({ httpMethod: 'GET' }),
      } as any;

    s3Mock.on(GetObjectCommand).rejects({ name: "Error " });

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Error checking for existing package');
  });

  // POST /package/{id} tests

  test('POST /package/{id} - Update Success (200)', async () => {
    const event: APIGatewayProxyEvent = {
      headers: { 'X-authorization': 'Bearer token' },
      body: JSON.stringify({ 
        Name: "test",
        Version: "version",
        ID: "test id",
        // Content: "UEsDBBQAAAAIAAeLb0bDQk5",
        URL: "url",
        debloat: "true",
        JSProgram: "true",
       }),
      pathParameters: ({ httpMethod: 'POST' }),
    } as any;

    dynamoDBMock.on(PutItemCommand).resolves({});
    s3Mock.on(PutObjectCommand).resolves({});

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("Hello from myFunction!");    
  });

  test('POST /package/{id} - Unauthorized (403)', async () => {
    const event: APIGatewayProxyEvent = {
      headers: {},
      body: ({ id: 'underscore' }),
      pathParameters: ({ httpMethod: 'POST' }),
    } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(403);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("Authentication failed due to invalid or missing AuthenticationToken.");
  });

  test('POST /package/{id} - Missing Any Data (400)', async () => {
    const event: APIGatewayProxyEvent = {
      headers: { 'X-authorization': 'Bearer token' },
      body: ({ }),
      pathParameters: ({ httpMethod: 'POST' }),
    } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)");
  });

  test('POST /package/{id} - Missing Some Data (400)', async () => {
    const event: APIGatewayProxyEvent = {
      headers: { 'X-authorization': 'Bearer token' },
      body: ({
        Name: "test",
        Content: "some content",
        URL: "url too",
        debloat: "true",
        JSProgram: "true",
       }),
      pathParameters: ({ httpMethod: 'POST' }),
    } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)");
  });

  test('POST /package/{id} - Invalid Data (Content and URL set) (400)', async () => {
    const event: APIGatewayProxyEvent = {
      headers: { 'X-authorization': 'Bearer token' },
      body: JSON.stringify({ 
        Name: "test",
        Version: "version",
        ID: "test id",
        Content: "some content",
        URL: "url too",
        debloat: "true",
        JSProgram: "true",
       }),
      pathParameters: ({ httpMethod: 'POST' }),
    } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)");
  });

  test('POST /package/{id} - Package Data does not exist (404)', async () => {
    const event: APIGatewayProxyEvent = {
      headers: { 'X-authorization': 'Bearer token' },
      body: JSON.stringify({ 
        Name: "test",
        Version: "version",
        ID: "test id",
        URL: "url too",
        debloat: "true",
        JSProgram: "true",
       }),
      pathParameters: ({ httpMethod: 'POST' }),
    } as any;

    s3Mock.on(HeadObjectCommand).rejects({ name: "NotFound" });

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    console.log('result:', result);

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("Package does not exists.");
  });

  test('POST /package/{id} - Error checking for existing packages (500)', async () => {
    const event: APIGatewayProxyEvent = {
      headers: { 'X-authorization': 'Bearer token' },
      body: JSON.stringify({ 
        Name: "test",
        Version: "version",
        ID: "test id",
        Content: "some content",
        debloat: "true",
        JSProgram: "true",
       }),
      pathParameters: ({ httpMethod: 'POST' }),
    } as any;

    s3Mock.on(HeadObjectCommand).rejects({ name: "Error" });

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    console.log('result:', result);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("Error checking for existing package");
  });

});
