import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from "../functions/api-package-regex/handler";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

// Mock the DynamoDB client
const dynamoDbMock = mockClient(DynamoDBClient);

describe("POST /package/byRegEx", () => {
  beforeEach(() => {
    dynamoDbMock.reset();
  });

  it("should return 403 if the X-authorization header is missing", async () => {
    const event: APIGatewayProxyEvent = {
      headers: {},
      body: JSON.stringify({ RegEx: ".*?Underscore.*" }),
    } as any;

    const result = (await handler(event, {} as any, () => {})) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(403);
    expect(result.body).toBe(JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken."));
  });

  it("should return 400 if the request body is invalid", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: "invalid-json",
    } as any;

    const result = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify("Invalid request body"));
  });

  it("should return 400 if the RegEx field is missing", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({}),
    } as any;

    const result = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify("Missing required field: RegEx"));
  });

  it("should return 200 with matching packages", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({ RegEx: ".*?Underscore.*" }),
    } as any;

    dynamoDbMock.on(ScanCommand).resolves({
      Items: [
        { Version: { S: "1.2.3" }, Name: { S: "Underscore" }, ID: { S: "underscore" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
        { Version: { S: "2.1.0" }, Name: { S: "Lodash" }, ID: { S: "lodash" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
      ],
    });

    const result = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(
      JSON.stringify([
        { Version: "1.2.3", Name: "Underscore", ID: "underscore" },
        //{ Version: "2.1.0", Name: "Lodash", ID: "lodash" }, // Doesn't match the regex
      ])
    );
  });

  it("should return 200 with one matching package out of two", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({ RegEx: "Lodash" }),
    } as any;

    dynamoDbMock.on(ScanCommand).resolves({
      Items: [
        { Version: { S: "1.2.3" }, Name: { S: "Underscore" }, ID: { S: "underscore" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
        { Version: { S: "2.1.0" }, Name: { S: "Lodash" }, ID: { S: "lodash" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
      ],
    });

    const result = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify([{ Version: "2.1.0", Name: "Lodash", ID: "lodash" }]));
  });

  it("should return 200 with two matching packages out of many from different fields", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({ RegEx: ".*?Lodash.*" }), // Contain 'Lodash' in readME or Name
    } as any;

    dynamoDbMock.on(ScanCommand).resolves({
      Items: [
        // no
        { Version: { S: "1.1.1" }, Name: { S: "Pizza lshado" }, ID: { S: "loda" }, ReadME: { S: "reading" }, JSProgram: { S: "soLODASmHeProgram Lodash" }, S3Location: { S: "s3" } },
        // no
        { Version: { S: "1.1.2" }, Name: { S: "Pizza hsadol" }, ID: { S: "loda" }, ReadME: { S: "reading" }, JSProgram: { S: "soLODASmHeProgram" }, S3Location: { S: "s3" } },
        // no
        { Version: { S: "1.1.3" }, Name: { S: "Pizza" }, ID: { S: "loda" }, ReadME: { S: "reading" }, JSProgram: { S: "soLODASmHeProgram Lodash" }, S3Location: { S: "s3" } },
        // yes readme
        { Version: { S: "1.2.3" }, Name: { S: "Underscore" }, ID: { S: "underscore" }, ReadME: { S: "ReadME, blah blah Lodash blah" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
        // yes name
        { Version: { S: "2.1.0" }, Name: { S: "Lodash" }, ID: { S: "lodash" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
        // no
        { Version: { S: "1.1.1" }, Name: { S: "Pizza" }, ID: { S: "loda" }, ReadME: { S: "reading" }, JSProgram: { S: "soLODASmHeProgram Lodash" }, S3Location: { S: "s3" } },

      ],
    });

    const result = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify([
      { Version: "1.2.3", Name: "Underscore", ID: "underscore" },
      { Version: "2.1.0", Name: "Lodash", ID: "lodash" },
    ]));
  });

  it("should return 200 when regex is dot star and get everything", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token "},
      body: JSON.stringify({ RegEx: ".*" }),
    } as any;

    dynamoDbMock.on(ScanCommand).resolves({
      Items: [
        { Version: { S: "1.2.3" }, Name: { S: "Underscore" }, ID: { S: "underscore" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
        { Version: { S: "2.1.0" }, Name: { S: "Lodash" }, ID: { S: "lodash" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
      ],
    });

    const result = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(
      JSON.stringify([
        { Version: "1.2.3", Name: "Underscore", ID: "underscore" },
        { Version: "2.1.0", Name: "Lodash", ID: "lodash" },
      ])
    );
  });

  it("should return 404 if no packages match the regex", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({ RegEx: ".*?NonExistent.*" }),
    } as any;

    dynamoDbMock.on(ScanCommand).resolves({
      Items: [
        { Version: { S: "1.2.3" }, Name: { S: "Underscore" }, ID: { S: "underscore" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
      ],
    });

    const result= await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe(JSON.stringify({ error: "No package found under this regex" }));
  });

  // TESTS FROM EMAIL //
  it("should return 404 if no packages match the regex 'ece461rules'", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({ RegEx: "ece461rules" }),
    } as any;

    dynamoDbMock.on(ScanCommand).resolves({
      Items: [
        // No match due to case sensitivity
        { Version: { S: "1.2.3" }, Name: { S: "ECE461rules" }, ID: { S: "ECE461rules1.2.3" }, ReadME: { S: "ReadME" }, JSProgram: { S: "someProgram" }, S3Location: { S: "s3" } },
      ],
    });

    const result = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe(JSON.stringify({ error: "No package found under this regex" }));
  });

  it("should return 404 if no packages match the regex '(a{1,99999}){1,99999}$'", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({ RegEx: "(a{1,99999}){1,99999}$" }),
    } as any;

    dynamoDbMock.on(ScanCommand).resolves({
      Items: [],
    });

    const result = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe(JSON.stringify({ error: "No package found under this regex" }));
  });

  it("should return 400 for invalid regex '(a{1,99999}){(1,99999$'", async () => {
    // Invalid regex - missing closing parenthesis
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({ RegEx: "(a{1,99999}){(1,99999$" }),
    } as any;

    dynamoDbMock.on(ScanCommand).resolves({
      Items: [],
    });

    const result = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify("Invalid regex pattern"));
  });

  it("should return 404 if no packages match the regex '(a|aa)*$'", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({ RegEx: "(a|aa)*$" }),
    } as any;

    dynamoDbMock.on(ScanCommand).resolves({
      Items: [],
    });

    const result = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe(JSON.stringify({ error: "No package found under this regex" }));
  });

  // END OF TESTS FROM EMAIL //

  xit("should return 500 if there is an error scanning DynamoDB", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({ RegEx: ".*?Underscore.*" }),
    } as any;

    dynamoDbMock.on(ScanCommand).rejects(new Error("DynamoDB error"));

    const result = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(result.body).toBe(JSON.stringify({ error: "Could not search packages" }));
  });
  
});
