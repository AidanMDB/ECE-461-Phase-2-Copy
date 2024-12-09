import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../amplify/functions/api-package-id-rate/handler'; 
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { SdkStreamMixin } from '@aws-sdk/types';

// Mock S3 client
const s3Mock = mockClient(S3Client);
const BUCKET_NAME = "packageStorage";

// Mock DynamoDB client
const dynamoDBMock = mockClient(DynamoDBClient);
const TABLE_NAME = "packageTable";

describe("Handler Tests", () => {
  beforeEach(() => {
    s3Mock.reset();
    dynamoDBMock.reset();
  });

  test("GET Request - Success (200)", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-Authorization": "Bearer token" },
      httpMethod: "GET",
      pathParameters: { id: "123" },
    } as any;

    s3Mock.on(HeadObjectCommand, { Bucket: BUCKET_NAME, Key: "123" }).resolves({});
    dynamoDBMock.on(GetItemCommand).resolves({});

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    // expect(result.body).toBe(JSON.stringify(""));
    // const responseBody = JSON.parse(result.body);
    // expect(responseBody).toEqual({
    //   BusFactor: 0.8,
    // //   BusFactorLatency: 0.1,
    //   Correctness: 0.9,
    // //   CorrectnessLatency: 0.1,
    //   RampUp: 0.7,
    // //   RampUpLatency: 0.1,
    //   ResponsiveMaintainer: 0.85,
    // //   ResponsiveMaintainerLatency: 0.1,
    //   LicenseScore: 0.95,
    // //   LicenseScoreLatency: 0.1,
    //   GoodPinningPractice: 0.9,
    // //   GoodPinningPracticeLatency: 0.1,
    //   PullRequest: 0.75,
    // //   PullRequestLatency: 0.1,
    //   NetScore: 0.85,
    // //   NetScoreLatency: 0.1,
    // });
  });

  test("GET Request - Unauthorized (403)", async () => {
    const event: APIGatewayProxyEvent = {
      headers: {},
      httpMethod: "GET",
      pathParameters: { id: "123" },
    } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(403);
    expect(result.body).toBe(
      JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
    );
  });

  test("GET Request - Missing Package ID (400)", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-Authorization": "Bearer token" },
      httpMethod: "GET",
      pathParameters: {}, // Missing 'id'
    } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("There is missing field(s) in the PackageID.");
  });

  test("GET Request - Package Not Found (404)", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-Authorization": "Bearer token" },
      httpMethod: "GET",
      pathParameters: { id: "nonexistent-package" },
    } as any;

    // s3Mock.on(HeadObjectCommand, { Bucket: BUCKET_NAME, Key: "nonexistent-package" }).rejects({
    //   name: "NotFound",
    // });
    dynamoDBMock.on(GetItemCommand).rejects({ name: "NotFound", });

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("Package does not exist.");
  });

  test("GET Request - Internal Server Error (500)", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-Authorization": "Bearer token" },
      httpMethod: "GET",
      pathParameters: { id: "123" },
    } as any;

    s3Mock.on(HeadObjectCommand, { Bucket: BUCKET_NAME, Key: "123" }).rejects(new Error("Unexpected error"));

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("The package rating system choked on at least one of the metrics.");
  });

  test("GET Request - Unsupported HTTP Method (400)", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-Authorization": "Bearer token" },
      httpMethod: "POST", // Unsupported method
      pathParameters: { id: "123" },
    } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe("There is missing field(s) in the PackageID.");
  });

  test("GET Request - Large Package ID (200)", async () => {
    const largePackageID = "a".repeat(1024); // Very long package ID
    const event: APIGatewayProxyEvent = {
      headers: { "X-Authorization": "Bearer token" },
      httpMethod: "GET",
      pathParameters: { id: largePackageID },
    } as any;

    s3Mock.on(HeadObjectCommand, { Bucket: BUCKET_NAME, Key: largePackageID }).resolves({});
    dynamoDBMock.on(GetItemCommand).resolves({});

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
  });

  test("GET Request - S3 Throttling (500)", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-Authorization": "Bearer token" },
      httpMethod: "GET",
      pathParameters: { id: "123" },
    } as any;

    s3Mock.on(HeadObjectCommand, { Bucket: BUCKET_NAME, Key: "123" }).rejects({
      name: "Throttling",
    });

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe(
      "The package rating system choked on at least one of the metrics."
    );
  });
});
