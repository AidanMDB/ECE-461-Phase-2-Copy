/**
 * This file was created by running 'amplify mock function api-authenticate' 
 * and then modifying the generated test file. 
 * It tests the handler function in the api-authenticate function.
 **/ 

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from "../amplify/functions/api-authenticate/handler";
import { CognitoIdentityProviderClient, AdminInitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { mockClient } from "aws-sdk-client-mock";

// Mock the AWS SDK client
const cognitoMock = mockClient(CognitoIdentityProviderClient);

describe("POST /authenticate", () => {
  beforeEach(() => {
    cognitoMock.reset();
  });

  it("should return 200 with a valid token when authentication is successful", async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({ User: { name: "testuser", isAdmin: true }, Secret: { password: "TestPassword123!" } }),
    } as any;

    cognitoMock.on(AdminInitiateAuthCommand).resolves({
      AuthenticationResult: {
        IdToken: "valid-id-token",
      },
    });

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify("bearer valid-id-token" ));
  });

  it("should return 200 with a valid token for the given example", async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        "User": {
          "name": "ece30861defaultadminuser",
          "isAdmin": true
        },
        "Secret": {
          "password": "correcthorsebatterystaple123(!__+@**(A'\"`;DROP TABLE packages;"
        }
      }),
    } as any;

    cognitoMock.on(AdminInitiateAuthCommand).resolves({
      AuthenticationResult: {
        IdToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      },
    });

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    //console.log(result.body);
    expect(result.body).toBe(JSON.stringify(`bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`));
  });

  it("should return 400 if the request body is invalid", async () => {
    const event: APIGatewayProxyEvent = {
      body: "invalid-json",
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify("There is missing field(s) in the AuthenticationRequest or it is formed improperly."));
  });

  it("should return 400 if required fields are missing", async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({ User: { name: "testuser", isAdmin: false } }),
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify("There is missing field(s) in the AuthenticationRequest or it is formed improperly."));
  });

  it("should return 401 if the user or password is invalid.", async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({ User: { name: "testuser", isAdmin: true }, Secret: { password: "WrongPassword" } }),
    } as any;

    cognitoMock.on(AdminInitiateAuthCommand).rejects({
        name: "NotAuthorizedException",
        message: "Incorrect username or password.",
      });
      
    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(401);
    expect(result.body).toBe(JSON.stringify("The user or password is invalid."));
  });

  xit("should return 500 if there is an error during authentication", async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({ User: { name: "testuser" }, Secret: { password: "TestPassword123!" } }),
    } as any;

    cognitoMock.on(AdminInitiateAuthCommand).rejects(new Error("InternalError"));

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(result.body).toContain("Error during authentication.");
  });

});