import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { jwtDecode } from 'jwt-decode';

// Initialize AWS Cognito client
const cognito = new CognitoIdentityProviderClient();

const USER_POOL_ID = process.env.USER_POOL_ID;

export const handler: APIGatewayProxyHandler = async (event) => {
    // Check for 'X-authorization' header
    const authHeader = event.headers["X-authorization"];
    if (!authHeader) {
        return {
            statusCode: 403,
            body: JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
        };
    }

    // Decode the JWT token to get user information
    const decodedToken: any = jwtDecode(authHeader.replace('Bearer ', ''));
    const userGroups = decodedToken['cognito:groups'] || [];

    // Check if the user has admin permissions
    if (!userGroups.includes('ADMINS')) {
        return {
            statusCode: 401,
            body: JSON.stringify("You do not have permission to register users.")
        };
    }

    // Parse the JSON body to get the user's credentials
    let requestBody;
    try {
        requestBody = JSON.parse(event.body || "{}");
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify("Invalid request body")
        };
    }

    const { User, Secret, Group } = requestBody;
    if (!User || !Secret || !User.name || !Secret.password || !Group) {
        return {
            statusCode: 400,
            body: JSON.stringify("Missing required fields: User.name, Secret.password, and Group")
        };
    }

    try {
        // Create the user in AWS Cognito
        const createUserParams = {
            UserPoolId: USER_POOL_ID,
            Username: User.name,
            TemporaryPassword: Secret.password,
            UserAttributes: [
                { Name: "email", Value: User.email },
                { Name: "email_verified", Value: "true" }
            ],
        };

        const createUserCommand = new AdminCreateUserCommand(createUserParams);
        await cognito.send(createUserCommand);

        // Add the user to the specified group
        const addUserToGroupParams = {
            UserPoolId: USER_POOL_ID,
            Username: User.name,
            GroupName: Group,
        };

        const addUserToGroupCommand = new AdminAddUserToGroupCommand(addUserToGroupParams);
        await cognito.send(addUserToGroupCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "User registered successfully." }),
        };
    } catch (error) {
        console.error("Error during user registration:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error during user registration.", error: (error as any).message }),
        };
    }
};