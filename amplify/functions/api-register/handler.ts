/**
 * This file is for handling the api-register REST API track.
**/

import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand, AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { jwtDecode } from 'jwt-decode';
import { auth } from "../../auth/resource";
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

// Initialize AWS Cognito client
const cognito = new CognitoIdentityProviderClient();

const USER_POOL_ID = process.env.USER_POOL_ID;
//const JWT_SECRET = process.env.JWT_SECRET;

export const handler: APIGatewayProxyHandler = async (event) => {
    // Check for 'X-authorization' header
    const authHeader = event.headers["X-Authorization"];
    if (!authHeader) {
        return {
            statusCode: 404,
            body: JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
        };
    }
    let requestBody;
    try {
        requestBody = JSON.parse(event.body || "{}");
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify("Missing required fields: User.name, Secret.password, and Action")
        };
    }

    // Decode the JWT token to get user information
    const decodedToken: any = jwtDecode(authHeader.replace('Bearer ', ''));
    const userGroups = decodedToken['cognito:groups'] || [];

    const { User, Secret, Action, Group } = requestBody;
    if (!User || !Secret || !User.name || !Secret.password || !Action) {
        return {
            statusCode: 400,
            body: JSON.stringify("Missing required fields: User.name, Secret.password, and Action")
        };
    }

    try {
        if (Action === 'register') {
            // Check if the user has admin permissions
            if (!userGroups.includes('Admin')) {
                return {
                    statusCode: 402,
                    body: JSON.stringify("You do not have permission to register users.")
                };
            }
            // Create the user in AWS Cognito
            const createUserParams = {
                UserPoolId: USER_POOL_ID,
                Username: User.name,
                TemporaryPassword: Secret.password,
                UserAttributes: [
                    { Name: "email", Value: User.email },
                    { Name: "email_verified", Value: "true" },
                    { Name: "custom:isAdmin", Value: User.isAdmin.toString() },
                ],
            };

            const createUserCommand = new AdminCreateUserCommand(createUserParams);
            await cognito.send(createUserCommand);

            // Add the user to the specified group
            if (Group) {
                const addUserToGroupParams = {
                    UserPoolId: USER_POOL_ID,
                    Username: User.name,
                    GroupName: Group,
                };
                const addUserToGroupCommand = new AdminAddUserToGroupCommand(addUserToGroupParams);
                await cognito.send(addUserToGroupCommand);
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ message: "User managed successfully." }),
            };
        }
        else if (Action === 'delete') {
            // Users can delete their own accounts, admins can delete any account
            if (User.name !== decodedToken.username && !userGroups.includes('Admin')) {
                return {
                    statusCode: 403,
                    body: JSON.stringify("You do not have permission to delete this user.")
                };
            }
            // Delete the user from AWS Cognito
            const deleteUserParams = {
                UserPoolId: USER_POOL_ID,
                Username: User.name,
            };

            const deleteUserCommand = new AdminDeleteUserCommand(deleteUserParams);
            await cognito.send(deleteUserCommand);

            return {
                statusCode: 200,
                body: JSON.stringify({ message: "User managed successfully." }),
            };
        }
        else {
            return {
                statusCode: 401,
                body: JSON.stringify("Invalid action. Supported actions: register, delete")
            };
        }
    } catch (error) {
        console.error("Error during user management:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error during user management.", error: (error as any).message }),
        };
    }
};