import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../amplify/functions/api-package-id-cost/handler';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

// mock dynamoDB calls
const dynamoDBMock = mockClient(DynamoDBClient);
const TABLE_NAME = "packageTable";

// mock s3 calls
const s3Mock = mockClient(S3Client);
const BUCKET_NAME = "packageStorage";

describe('Package API Handler', () => {
    beforeEach(() => {
      dynamoDBMock.reset();
      s3Mock.reset();
    });
  
    // test('GET /package/{id}/cost - Success (200) w/out dependency', async () => {
        // const event: APIGatewayProxyEvent = {
        //     headers: { 'X-Authorization': 'Bearer token' },
        //     body: JSON.stringify({ "Version": "Exact (1.2.3)", "Name": 'name' }),
        //   } as any;

        // dynamoDBMock.on(ScanCommand).resolves({
        //     Items: [
        //       { Version: { S: "1.2.3" }, Name: { S: "Underscore" }, ID: { S: "underscore" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
        //       { Version: { S: "2.1.0" }, Name: { S: "Lodash" }, ID: { S: "lodash" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
        //     ],
        // });
        // const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

        // expect(result.statusCode).toBe(200);
        // expect(result.body).toBe(
        //     JSON.stringify([
        //         { Version: "1.2.3", Name: "Underscore", ID: "underscore" }
        //         // { Version: "2.1.0", Name: "Lodash", ID: "lodash" }
        //     ])
        // );
    // });

    // test('GET /package/{id}/cost - Success (200) w dependency', async () => {
        
    // });

    test('GET /package/{id}/cost - Missing field(s) in the packageID (400)', async () => {
        const event: APIGatewayProxyEvent = {
            headers: { 'X-Authorization': 'Bearer token' },
            pathParameters: { }
          } as any;

        const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(400);
        expect(result.body).toBe(
            JSON.stringify("There is missing field(s) in the PackageID")
        );
    });

    test('GET /package/{id}/cost - Unauthorized (403)', async () => {
        const event: APIGatewayProxyEvent = {
            headers: {  },
            pathParameters: { id: '123' }
          } as any;

        const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(403);
        expect(result.body).toBe(
            JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
        );
    });

    test('GET /package/{id}/cost - Package does not exist (404)', async () => {
        const event: APIGatewayProxyEvent = {
            headers: { 'X-Authorization': 'Bearer token' },
            pathParameters: { id: '123' }
        } as any;

        s3Mock.on(HeadObjectCommand, { Bucket: BUCKET_NAME, Key: "123" }).rejects({});

        const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(404);
        expect(result.body).toBe(
            JSON.stringify("Package does not exist.")
        );
    });

    test('GET /package/{id}/cost - The package rating system choked on at least one of the metrics. (500)', async () => {
        const event: APIGatewayProxyEvent = {
            headers: { 'X-Authorization': 'Bearer token' },
            pathParameters: { id: '123' }
        } as any;

        s3Mock.on(HeadObjectCommand, { Bucket: BUCKET_NAME, Key: "123" }).resolves({});
        dynamoDBMock.on(GetCommand).rejects({});

        const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(500);
        expect(result.body).toBe(
            JSON.stringify("The package rating system choked on at least one of the metrics.")
        );
    });
});