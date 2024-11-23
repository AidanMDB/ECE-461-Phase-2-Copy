import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../functions/api-package-list/handler';
import { S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

const s3Mock = mockClient(S3Client);

describe('Package API Handler', () => {
    beforeEach(() => {
      s3Mock.reset();
    });
  
    test('GET /list - Success (200)', async () => {
        const event: APIGatewayProxyEvent = {
            headers: { 'X-authorization': 'Bearer token' },
            body: JSON.stringify({  }),
          } as any;

        const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

        console.log('1',result);

        expect(result.statusCode).toBe(200);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.plannedTracks[0]).toBe("Access control track");
    });

    test('GET /list - Unauthorized (403)', async () => {
      const event: APIGatewayProxyEvent = {
          headers: {  },
          body: JSON.stringify({  }),
        } as any;

      const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

      console.log('2',result);

      expect(result.statusCode).toBe(403);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toBe("Authentication failed due to invalid or missing AuthenticationToken.");
  });
});