import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AdminCreateUserCommand, AdminDeleteUserCommand, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";
import { handler } from "../amplify/functions/api-register/handler"; 
import { mockClient } from "aws-sdk-client-mock";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import  jwtDecode  from 'jwt-decode';
import jwt from 'jsonwebtoken';

// Create a mock for the CognitoIdentityProviderClient
const cognitoMock = mockClient(CognitoIdentityProviderClient);

/*
Here are all the status codes and their body messages:
- 200: { "message": "User managed successfully." }
- 400: "Missing required fields: User.name, Secret.password, and Action"
- 401: "Invalid action. Supported actions: register, delete"
- 402: "You do not have permission to register users."
- 403: "You do not have permission to delete this user."
- 404: "Authentication failed due to invalid or missing AuthenticationToken."
- 500: { "message": "Error during user management.", "error": "error message" }
*/
describe("User Management Endpoint", () => {
  beforeEach(() => {
    cognitoMock.reset();
  });

  it("should return 404 if the authentication token is missing", async () => {
    const event: APIGatewayProxyEvent = {
      headers: {},
      body: JSON.stringify({
        User: {
          name: "newuser",
          isAdmin: false,
          email: "newuser@example.com"
        },
        Secret: {
          password: "NewUserPassword123!"
        },
        Action: "register"
      }),
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe(JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken."));
  });

  it("should return 402 if a non-admin tries to register a user", async () => {
    const tokenPayload = {
      username: "nonadminuser",
      'cognito:groups': [],
      exp: Math.floor(Date.now() / 1000) + (10 * 60 * 60), // 10 hours expiration
    };
    const token = jwt.sign(tokenPayload, 'dummy-secret');

    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": `Bearer ${token}` },
      body: JSON.stringify({
        User: {
          name: "newuser",
          isAdmin: false,
          email: "newuser@example.com"
        },
        Secret: {
          password: "NewUserPassword123!"
        },
        Action: "register"
      }),
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(402);
    expect(result.body).toBe(JSON.stringify("You do not have permission to register users."));
  });

  it("should return 200 if an admin registers a user", async () => {
    const tokenPayload = {
      username: "adminuser",
      'cognito:groups': ['Admin'],
      exp: Math.floor(Date.now() / 1000) + (10 * 60 * 60), // 10 hours expiration
    };
    const token = jwt.sign(tokenPayload, "dummy-secret");

    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": `Bearer ${token}` },
      body: JSON.stringify({
        User: {
          name: "newuser",
          isAdmin: false,
          email: "newuser@example.com"
        },
        Secret: {
          password: "NewUserPassword123!"
        },
        Action: "register"
      }),
    } as any;

    cognitoMock.on(AdminCreateUserCommand).resolves({});
    cognitoMock.on(AdminAddUserToGroupCommand).resolves({});

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify({ "message": "User managed successfully." }));
  });

  it("should return 403 if a non-admin tries to delete another user", async () => {
    const tokenPayload = {
      username: "nonadminuser",
      'cognito:groups': [],
      exp: Math.floor(Date.now() / 1000) + (10 * 60 * 60), // 10 hours expiration
    };
    const token = jwt.sign(tokenPayload, "dummy-secret");

    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": `Bearer ${token}` },
      body: JSON.stringify({
        User: {
          name: "otheruser",
          isAdmin: false
        },
        Secret: {
          password: "OtherUserPassword123!"
        },
        Action: "delete"
      }),
    } as any;

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(403);
    expect(result.body).toBe(JSON.stringify("You do not have permission to delete this user."));
  });

  it("should return 200 if an admin deletes a user", async () => {
    const tokenPayload = {
      username: "adminuser",
      'cognito:groups': ['Admin'],
      exp: Math.floor(Date.now() / 1000) + (10 * 60 * 60), // 10 hours expiration
    };
    const token = jwt.sign(tokenPayload, "dummy-secret");

    const event: APIGatewayProxyEvent = {
      headers: { "X-authorization": `Bearer ${token}` },
      body: JSON.stringify({
        User: {
          name: "userToDelete",
          isAdmin: false
        },
        Secret: {
          password: "UserToDeletePassword123!"
        },
        Action: "delete"
      }),
    } as any;

    cognitoMock.on(AdminDeleteUserCommand).resolves({});

    const result: APIGatewayProxyResult = await handler(event, {} as any, () => {}) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify({ "message": "User managed successfully." }));
  });
});