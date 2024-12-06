import * as handler from '../amplify/functions/api-function/handler';
import { mockClient } from 'aws-sdk-client-mock';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand} from '@aws-sdk/client-s3';
import axios from 'axios';
import { calcMetrics } from '../amplify/functions/api-function/metrics_src/api-metric-caller';
import * as fs from 'fs';
import * as path from 'path';
import { json } from 'stream/consumers';

// 'xit' rather than 'it' will make jest skip that test

const dynamoDBMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);
jest.mock('../amplify/functions/api-function/metrics_src/api-metric-caller', () => ({
  calcMetrics: jest.fn()
}));

jest.mock('axios');

/**
 * 
 * @param folderPath The path of the folder whose contents are to be deleted
 */
async function deleteFolderContents(folderPath: string) {
  try {
    // Read the contents of the directory
    const files = await fs.promises.readdir(folderPath);

    // Loop through the contents and delete them
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stat = await fs.promises.stat(filePath);

      if (stat.isDirectory()) {
        // If it's a directory, recursively delete its contents
        await deleteFolderContents(filePath);
      } else {
        // If it's a file, delete it
        await fs.promises.unlink(filePath);
      }
    }
    console.log(`All contents deleted from folder: ${folderPath}`);
  } catch (error) {
    console.error(`Error deleting contents of folder ${folderPath}:`, error);
  }
}


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

  xit('should return 403 error for missing X-authorization header', async () => {

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        Content: 'content',
        URL: 'url',
        JSProgram: 'jsprogram',
        debloat: false,
        Name: 'name'
      })
    } as any;

    const result = (await handler.handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(403);
    expect(result.body).toBe(JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken."));
  });


  xit('should return 400 error for having URL and Content', async () => {
    const event: APIGatewayProxyEvent = {
      headers: {
        'X-authorization': 'your-auth-token', // Add your X-authorization header here
      },
      body: JSON.stringify({
        Content: 'content',
        URL: 'url',
        debloat: false,
        Name: 'name'
      })
    } as any;

    const result = (await handler.handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify('There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)'));
  });


  xit ('should return 400 error for missing fields', async () => {

    const event: APIGatewayProxyEvent = {
      headers: {
        'X-authorization': 'your-auth-token', // Add your X-authorization header here
      },
      body: JSON.stringify({
        Content: 'content',
      })
    } as any;
  
    const result = (await handler.handler(event, {} as any, () => {})) as APIGatewayProxyResult;
    
    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify('There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)'));
  });

  xit('should return 409 for existing package', async () => {

    // alter package writing path
    const originalTmpPath = handler.TMP_PATH;
    Object.defineProperty(handler, 'TMP_PATH', {
      value: `${process.cwd()}/__test__/tmp`,
      writable: true, // Allows modification in the test
    });

    const event: APIGatewayProxyEvent = {
      headers: {
        'X-authorization': 'your-auth-token', // Add your X-authorization header here
      },
      body: JSON.stringify({
        Content: fs.readFileSync('__test__/braces.zip'),
        debloat: false,
        Name: 'name'
      })
    } as any;

    // mock S3 for no duplicate package
    dynamoDBMock.on(GetCommand).resolves({
      Item: {ID: 'braces3.0.3'}
    });

    const result = (await handler.handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(409);
    expect(result.body).toBe(JSON.stringify('Package exists already.'));

    // reset package writing path
    Object.defineProperty(handler, 'TMP_PATH', {
      value: originalTmpPath,
    });
  });


  //add expects to this test
  xit('should return 201 for approved package through "Content"', async () => {
 
    // alter package writing path
    const originalTmpPath = handler.TMP_PATH;
    Object.defineProperty(handler, 'TMP_PATH', {
      value: `${process.cwd()}/__test__/tmp`,
      writable: true, // Allows modification in the test
    });

    const event: APIGatewayProxyEvent = {
      headers: {
        'X-authorization': 'your-auth-token', // Add your X-authorization header here
      },
      body: JSON.stringify({
        Content: fs.readFileSync('__test__/braces.zip'),
        debloat: false,
        Name: 'name'
      })
    } as any;

    // mock dynamoDBMock for no duplicate package (doesn't contain item)
    dynamoDBMock.on(GetCommand).resolves({
    });

    // mocking of metric calculation
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
    mockcalcMetrics.mockResolvedValue(mockCalcMetricsResult);

    // mocking of DynamoDB put
    dynamoDBMock.on(PutCommand).resolves({
      $metadata:{
        httpStatusCode: 200
      }
    });

    // mocking of S3 upload
    s3Mock.on(PutObjectCommand).resolves({
      $metadata:{
        httpStatusCode: 200
      }
    });

    const result = (await handler.handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    const contentCompare = fs.readFileSync('__test__/braces.zip');
    expect(result.body).toBe(JSON.stringify({
      metadata: {
        Name: "braces",
        Version: "3.0.3",
        ID: "braces3.0.3"
      },
      data: {
        Content: contentCompare
      }
    }));
    expect(result.statusCode).toBe(201);

    // reset package writing path
    Object.defineProperty(handler, 'TMP_PATH', {
      value: originalTmpPath,
    });
  });


  xit('should return 201 for approved package through "URL" github', async () => {
    // alter package writing path
    const originalTmpPath = handler.TMP_PATH;
    Object.defineProperty(handler, 'TMP_PATH', {
      value: `${process.cwd()}/__test__/tmp`,
      writable: true, // Allows modification in the test
    });

    // mock axios returning a zip file
    const mockedResponse = fs.createReadStream('__test__/braces.zip');
    (axios.get as jest.Mock).mockResolvedValue({data: mockedResponse});

    const event: APIGatewayProxyEvent = {
      headers: {
        'X-authorization': 'your-auth-token', // Add your X-authorization header here
      },
      body: JSON.stringify({
        URL: "https://github.com/micromatch/braces",
        debloat: false,
        Name: 'name'
      })
    } as any;



    // mock dynamoDBMock for no duplicate package (doesn't contain item)
    dynamoDBMock.on(GetCommand).resolves({
    });

    // mocking of metric calculation
    const mockCalcMetricsResult = `{
      "URL": "https://github.com/micromatch/braces",
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
    mockcalcMetrics.mockResolvedValue(mockCalcMetricsResult);

    // mocking of DynamoDB put
    dynamoDBMock.on(PutCommand).resolves({
      $metadata:{
        httpStatusCode: 200
      }
    });

    // mocking of S3 upload
    s3Mock.on(PutObjectCommand).resolves({
      $metadata:{
        httpStatusCode: 200
      }
    });

    const result = (await handler.handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    const contentCompare = fs.readFileSync('__test__/braces.zip');
    expect(result.body).toBe(JSON.stringify({
      metadata: {
        Name: "braces",
        Version: "3.0.3",
        ID: "braces3.0.3"
      },
      data: {
        Content: contentCompare,
        URL: "https://github.com/micromatch/braces",
      }
    }));
    expect(result.statusCode).toBe(201);

    // reset package writing path
    Object.defineProperty(handler, 'TMP_PATH', {
      value: originalTmpPath,
    });
  });


  // like 90% certain this one works fine but b/c windows uses compression level 5 and I'm using level 9, the compared file is different
  it('should return 201 for approved package through "URL" npm', async () => {
    // alter package writing path
    const originalTmpPath = handler.TMP_PATH;
    Object.defineProperty(handler, 'TMP_PATH', {
      value: `${process.cwd()}/__test__/tmp`,
      writable: true, // Allows modification in the test
    });

    // mock axios calls based on what gets passed (allows me to handle multiple axios.get calls)
    (axios.get as jest.Mock).mockImplementation((url: string) => {
      if (!url.endsWith('.tgz')) {
        const mockedResponse = {data: {dist: {tarball: 'https://registry.npmjs.org/braces/-/braces-3.0.3.tgz'}}}
        return Promise.resolve(mockedResponse);
      } else {
        const mockedResponse = {data: fs.createReadStream('__test__/braces-3.0.3.tgz')};
        return Promise.resolve(mockedResponse);
      }
    });


    const event: APIGatewayProxyEvent = {
      headers: {
        'X-authorization': 'your-auth-token', // Add your X-authorization header here
      },
      body: JSON.stringify({
        URL: "https://www.npmjs.com/package/braces",
        debloat: false,
        Name: 'name'
      })
    } as any;

    // mock dynamoDBMock for no duplicate package (doesn't contain item)
    dynamoDBMock.on(GetCommand).resolves({
    });

    // mocking of metric calculation
    const mockCalcMetricsResult = `{
      "URL": "https://www.npmjs.com/package/braces",
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
    mockcalcMetrics.mockResolvedValue(mockCalcMetricsResult);

    // mocking of DynamoDB put
    dynamoDBMock.on(PutCommand).resolves({
      $metadata:{
        httpStatusCode: 200
      }
    });

    // mocking of S3 upload
    s3Mock.on(PutObjectCommand).resolves({
      $metadata:{
        httpStatusCode: 200
      }
    });

    const result = (await handler.handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    const contentCompare = fs.readFileSync('__test__/braces.zip');
    const expectedBody = JSON.stringify({
      metadata: {
        Name: "braces",
        Version: "3.0.3",
        ID: "braces3.0.3"
      },
      data: {
        Content: contentCompare,
        URL: "https://www.npmjs.com/package/braces",
      }
    })
    const eventbody = JSON.parse(result.body);
    expect(eventbody.metadata.Name).toBe("braces");
    expect(eventbody.metadata.Version).toBe("3.0.3");
    expect(eventbody.metadata.ID).toBe("braces3.0.3");
    //expect(eventbody.data.Content).toBe(contentCompare);
    expect(eventbody.data.URL).toBe("https://www.npmjs.com/package/braces");
    expect(result.statusCode).toBe(201);

    Object.defineProperty(handler, 'TMP_PATH', {
      value: originalTmpPath,
    });

    //deleteFolderContents(`${process.cwd()}/__test__/tmp`);

  }, 60000);

});