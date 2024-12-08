/**
 * This file was created by running 'amplify mock function api-reset'
 * and then modifying the generated test file. 
 * It tests the handler function in the api-reset function.
 **/ 

import { handler } from "../functions/api-reset/handler";
import { S3Client, ListBucketsCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { DynamoDBClient, ListTablesCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { CognitoIdentityProviderClient, ListUsersCommand, AdminDeleteUserCommand, AdminDisableUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { mockClient } from "aws-sdk-client-mock";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// Mock the AWS SDK clients
const s3Mock = mockClient(S3Client);
const dynamoDbMock = mockClient(DynamoDBClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);

describe("POST /reset", () => {
  beforeEach(() => {
    s3Mock.reset();
    dynamoDbMock.reset();
    cognitoMock.reset();
  });

  it("should return 403 if the X-authorization header is missing", async () => {
    const event: APIGatewayProxyEvent = {
      headers: {},
      body: JSON.stringify({}),
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(403);
    expect(result.body).toBe(JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken."));
  });
/*
  it("should return 400 if the request body is invalid", async () => {
    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: "invalid-json",
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify("Invalid request body"));
  });
*/
  it("should return 200 when reset is complete", async () => {
    // Mock S3 responses
    s3Mock.on(ListBucketsCommand).resolves({ Buckets: [{ Name: "bucket1" }, { Name: "bucket2" }] });
    s3Mock.on(ListObjectsV2Command).resolves({ Contents: [{ Key: "file1" }, { Key: "file2" }] });
    s3Mock.on(DeleteObjectsCommand).resolves({ Deleted: [{ Key: "file1" }, { Key: "file2" }] });

    // Mock DynamoDB responses
    dynamoDbMock.on(ListTablesCommand).resolves({ TableNames: ["table1", "table2"] });
    dynamoDbMock.on(DeleteTableCommand).resolves({});

    // Mock Cognito responses
    cognitoMock.on(ListUsersCommand).resolves({
      Users: [
        { Username: "user1", Attributes: [{ Name: "custom:isAdmin", Value: "false" }] },
        { Username: "admin", Attributes: [{ Name: "custom:isAdmin", Value: "true" }] },
      ],
    });
    cognitoMock.on(AdminDeleteUserCommand).resolves({});
    cognitoMock.on(AdminDisableUserCommand).resolves({});

    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({}),
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify({ message: "Reset complete." }));
  });

  xit("should return 500 if there is an error during reset", async () => {
    // Mock S3 responses with an error
    s3Mock.on(ListBucketsCommand).rejects(new Error("S3 error"));

    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({}),
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(result.body).toContain("Error during reset.");
  });

  xit("should return 500 if there is an error listing DynamoDB tables", async () => {
    // Mock DynamoDB responses with an error
    dynamoDbMock.on(ListTablesCommand).rejects(new Error("DynamoDB error"));

    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({}),
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(result.body).toContain("Error during reset.");
  });

  xit("should return 500 if there is an error listing Cognito users", async () => {
    // Mock Cognito responses with an error
    cognitoMock.on(ListUsersCommand).rejects(new Error("Cognito error"));

    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": "Bearer token" },
      body: JSON.stringify({}),
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(result.body).toContain("Error during reset.");
  });

});