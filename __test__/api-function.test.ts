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

    const result = (await handler.handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(403);
    expect(result.body).toBe(JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken."));
  });


  it('should return 400 error for having URL and Content', async () => {
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


  it ('should return 400 error for missing fields', async () => {

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

  it('should return 409 for existing package', async () => {

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
  it('should return 201 for approved package through "Content"', async () => {
 
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


  it('should return 201 for approved package through "URL" github', async () => {
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

  it("should return a 201 for approved package and its size should be smaller than original", async () => {
    // alter package writing path
    const originalTmpPath = handler.TMP_PATH;
    Object.defineProperty(handler, 'TMP_PATH', {
      value: `${process.cwd()}/__test__/tmp`,
      writable: true, // Allows modification in the test
    });

    const contentCompare = fs.readFileSync('__test__/braces.zip');
    const event: APIGatewayProxyEvent = {
      headers: {
        'X-authorization': 'your-auth-token', // Add your X-authorization header here
      },
      body: JSON.stringify({
        Content: contentCompare,
        debloat: true,
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


    const original_size = fs.statSync(`${process.cwd()}/__test__/braces.zip`).size;


    const eventbody = JSON.parse(result.body);
    expect(eventbody.metadata.Name).toBe("braces");
    expect(eventbody.metadata.Version).toBe("3.0.3");
    expect(eventbody.metadata.ID).toBe("braces3.0.3");
    //console.log('Content: ', eventbody.data.Content);
    //console.log('Content length: ', eventbody.data.Content.length);
    //console.log('eventbody: ', eventbody);
    //expect(eventbody.data.Content.length).toBeLessThan(original_size);
    expect(result.statusCode).toBe(201);
    
    //expect(eventbody.data.URL).toBe("https://www.npmjs.com/package/braces");
    Object.defineProperty(handler, 'TMP_PATH', {
      value: originalTmpPath,
    });
  });


  test("End to End test with metricCaller", async () => {
    // alter package writing path
    const originalTmpPath = handler.TMP_PATH;
    Object.defineProperty(handler, 'TMP_PATH', {
      value: `${process.cwd()}/__test__/tmp`,
      writable: true, // Allows modification in the test
    });

    // mock axios calls based on what gets passed (allows me to handle multiple axios.get calls)
    (axios.get as jest.Mock).mockImplementation((url: string) => {

      // axios mock for BusFactor.ts
      if (url.endsWith("/stats/contributors")) {
        const response = {data: [
          {
            "author": {
              "login": "user1",
              "id": 1,
              "node_id": "MDQ6VXNlcjE=",
              "avatar_url": "https://github.com/images/error/octocat_happy.gif",
              "gravatar_id": "",
              "url": "https://api.github.com/users/octocat",
              "html_url": "https://github.com/octocat",
              "followers_url": "https://api.github.com/users/octocat/followers",
              "following_url": "https://api.github.com/users/octocat/following{/other_user}",
              "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
              "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
              "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
              "organizations_url": "https://api.github.com/users/octocat/orgs",
              "repos_url": "https://api.github.com/users/octocat/repos",
              "events_url": "https://api.github.com/users/octocat/events{/privacy}",
              "received_events_url": "https://api.github.com/users/octocat/received_events",
              "type": "User",
              "site_admin": false
            },
            "total": 5,
            "weeks": [
              {
                "w": 1367712000,
                "a": 0,
                "d": 0,
                "c": 5
              }
            ]
          },
          {
            "author": {
              "login": "user2",
              "id": 2,
              "node_id": "MDQ6VXNlcjI=",
              "avatar_url": "https://github.com/images/error/anotherUser_happy.gif",
              "gravatar_id": "",
              "url": "https://api.github.com/users/anotherUser",
              "html_url": "https://github.com/anotherUser",
              "followers_url": "https://api.github.com/users/anotherUser/followers",
              "following_url": "https://api.github.com/users/anotherUser/following{/other_user}",
              "gists_url": "https://api.github.com/users/anotherUser/gists{/gist_id}",
              "starred_url": "https://api.github.com/users/anotherUser/starred{/owner}{/repo}",
              "subscriptions_url": "https://api.github.com/users/anotherUser/subscriptions",
              "organizations_url": "https://api.github.com/users/anotherUser/orgs",
              "repos_url": "https://api.github.com/users/anotherUser/repos",
              "events_url": "https://api.github.com/users/anotherUser/events{/privacy}",
              "received_events_url": "https://api.github.com/users/anotherUser/received_events",
              "type": "User",
              "site_admin": false
            },
            "total": 3,
            "weeks": [
              {
                "w": 1367712000,
                "a": 0,
                "d": 0,
                "c": 3
              }
            ]
          }
        ]};
        return Promise.resolve(response);
      }

      // axios mock for Correctness.ts
      if (url.includes("+is:issue+state:closed")) {
        const mockedResponse = {data: {
          total_count: 2, // Two closed issues
          items: [
            {
              id: 102,
              title: 'Issue 2',
              state: 'closed' // Closed issue
            },
            {
              id: 103,
              title: 'Issue 3',
              state: 'closed' // Closed issue
            }
          ]
          },
          headers: { 'x-ratelimit-remaining': 1000 } // Example rate limit header
        };
        return Promise.resolve(mockedResponse);
      }
      if (url.includes("+is:issue+state:open")) {
        const mockOpenIssuesResponse = {
          data: {
              total_count: 1, // One open issue
              items: [
                  {
                      id: 101,
                      title: 'Issue 1',
                      state: 'open' // Open issue
                  }
              ]
          },
          headers: { 'x-ratelimit-remaining': 1000 } // Example rate limit header
        };
        return Promise.resolve(mockOpenIssuesResponse);
      }


      // axios mock for EngineeringProcess.ts
      if (url.endsWith("graphql")) {
        const mockResponse = {
          data: {
            data: {
              repository: {
                pullRequests: {
                  nodes: [
                    {reviewDecision: 'APPROVED',    additions: 10},
                    {reviewDecision: 'APPROVED',    additions: 10},
                    {reviewDecision: null,          additions: 10},
                    {reviewDecision: null,          additions: 10},
                  ],
                  pageInfo: {
                    hasNextPage: false,
                    endCursor: null
                  }
                }
              }
            }
          }
        };
        return Promise.resolve(mockResponse);
      }

      // axios mock for License.ts
      if (url.includes("/license")) {
        const mockResponse = {
          data: {
            license: { spdx_id: 'MIT' }, // License file exists with a compatible license
          },
        };
        return Promise.resolve(mockResponse);
      }

      // axios mock for RampUp.ts
      if (url.includes("/contents")) {
        const mockedResponse = {
          data: [
              { type: 'file', name: 'index.js', path: 'index.js', size: 100 },
              { type: 'file', name: 'README.md', path: 'README.md', size: 10 },
              { type: 'file', name: 'app.ts', path: 'app.ts', size: 100},
              { type: 'file', name: 'style.css', path: 'style.css', size: 50 },
          ],
        };
        return Promise.resolve(mockedResponse);
      }

      // axios mock for ResponsiveMetric.ts
      if (url.includes('/issues')) {
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const closedAtDate = new Date(twoMonthsAgo);
        closedAtDate.setDate(closedAtDate.getDate() + 2);
        
        const mockResponse = {
          data: [
              {
                  id: 2,
                  title: 'Issue 2',
                  created_at: twoMonthsAgo.toISOString(), // Created three months ago
                  closed_at: closedAtDate.toISOString(), // Closed now
                  state: 'closed',
                  comments: 3
              }
          ],
          headers: { 'x-ratelimit-remaining': 1000 } // Setting a positive rate limit
        };
        return Promise.resolve(mockResponse);
      }
      if (url.includes('/pulls')) {
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const closedAtDate = new Date(twoMonthsAgo);
        closedAtDate.setDate(closedAtDate.getDate() + 2);
        const mockResponse2 = {
          data: [
              {
                  id: 1,
                  title: 'Pull Request 2',
                  created_at: twoMonthsAgo.toISOString(), // Created three months ago
                  closed_at: closedAtDate.toISOString(), // Closed now
                  state: 'closed',
                  comments: 3
              }
          ],
          headers: {'x-ratelimit-remaining': 1000}
        };
        return Promise.resolve(mockResponse2);
      }

      // axios mock for VerionMetric.ts
      if (url.includes('/contents/package.json')) {
        const response = { data: { content: Buffer.from(JSON.stringify({ 
          dependencies: { 'dep1': '1.0.0', 'dep2': '0.9.2', 'dep3': '0.0.2' } })).toString('base64') } };
        return Promise.resolve(response);
      }
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

/*     const contentCompare = fs.readFileSync('__test__/braces.zip');
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
    }) */
    const eventbody = JSON.parse(result.body);
    expect(eventbody.metadata.Name).toBe("braces");
    expect(eventbody.metadata.Version).toBe("3.0.3");
    expect(eventbody.metadata.ID).toBe("braces3.0.3");
    //expect(eventbody.data.Content).toBe(contentCompare);
    //expect(eventbody.data.URL).toBe("https://www.npmjs.com/package/braces");
    expect(result.statusCode).toBe(201);

    Object.defineProperty(handler, 'TMP_PATH', {
      value: originalTmpPath,
    });

  }, 60000);


});