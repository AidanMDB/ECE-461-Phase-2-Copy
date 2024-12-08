import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler } from "../functions/api-authenticate/handler";
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
      body: JSON.stringify({ User: { name: "testuser" }, Secret: { password: "TestPassword123!" } }),
    } as any;

    cognitoMock.on(AdminInitiateAuthCommand).resolves({
      AuthenticationResult: {
        IdToken: "valid-id-token",
      },
    });

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify({ token: "valid-id-token" }));
  });

  it("should return 400 if the request body is invalid", async () => {
    const event: APIGatewayProxyEvent = {
      body: "invalid-json",
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify("Invalid request body"));
  });

  it("should return 400 if required fields are missing", async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({ User: { name: "testuser" } }),
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify("Missing required fields: User.name and Secret.password"));
  });

  it("should return 401 if the user or password is invalid.", async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({ User: { name: "testuser" }, Secret: { password: "WrongPassword" } }),
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