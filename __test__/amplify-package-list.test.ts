import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../amplify/functions/api-package-list/handler';
// import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

const dynamoDBMock = mockClient(DynamoDBClient);

describe('Package API Handler', () => {
    beforeEach(() => {
      dynamoDBMock.reset();
    });
  
    test('GET /packages - Success (200) No offset', async () => {
        const event: APIGatewayProxyEvent = {
            headers: { 'X-authorization': 'Bearer token' },
            body: JSON.stringify({ "Version": "Bounded (1.2.3)", "Name": 'name' }),
          } as any;

        dynamoDBMock.on(ScanCommand).resolves({
            Items: [
              { Version: { S: "1.2.3" }, Name: { S: "Underscore" }, ID: { S: "underscore" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
              { Version: { S: "2.1.0" }, Name: { S: "Lodash" }, ID: { S: "lodash" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
            ],
        });
        const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(200);
        expect(result.body).toBe(
            JSON.stringify([
                { Version: "1.2.3", Name: "Underscore", ID: "underscore" },
                { Version: "2.1.0", Name: "Lodash", ID: "lodash" }
            ])
        );
    });

    test('GET /packages - Success (200) With Offset', async () => {
        const event: APIGatewayProxyEvent = {
            headers: { 'X-authorization': 'Bearer token', 'offset': '3' },
            body: JSON.stringify({ "Version": "Bounded (1.2.3)", "Name": 'name' }),
          } as any;

        dynamoDBMock.on(ScanCommand).resolves({
            Items: [
              { Version: { S: "1.2.3" }, Name: { S: "Underscore" }, ID: { S: "underscore" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
              { Version: { S: "2.1.0" }, Name: { S: "Lodash" }, ID: { S: "lodash" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
            ],
        });
        const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(200);
        expect(result.body).toBe(
            JSON.stringify([
                { Version: "1.2.3", Name: "Underscore", ID: "underscore" },
                { Version: "2.1.0", Name: "Lodash", ID: "lodash" }
            ])
        );
    });

    test('GET /packages - Unauthorized (403)', async () => {
      const event: APIGatewayProxyEvent = {
          headers: {  },
          body: JSON.stringify({ "Version": "Bounded (1.2.3)", "Name": 'name' }),
        } as any;

      const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(403);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toBe("Authentication failed due to invalid or missing AuthenticationToken.");
    });

    test('GET /packages - Too many packages returned (413)', async () => {
        const event: APIGatewayProxyEvent = {
            headers: { 'X-authorization': 'Bearer token', 'offset': '1' },
            body: JSON.stringify({ "Version": "Bounded (1.2.3)", "Name": 'name' }),
          } as any;
  
          dynamoDBMock.on(ScanCommand).resolves({
            Items: [
              { Version: { S: "1.2.3" }, Name: { S: "Underscore" }, ID: { S: "underscore" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
              { Version: { S: "2.1.0" }, Name: { S: "Lodash" }, ID: { S: "lodash" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
            ],
        });
        const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;
  
        expect(result.statusCode).toBe(413);
        const responseBody = JSON.parse(result.body);
        expect(responseBody).toBe("Too many packages returned.");
      });

});