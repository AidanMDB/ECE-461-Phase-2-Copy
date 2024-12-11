/**
 * This file is for handling the api-authenticate REST API track.
**/

import { CognitoIdentityProviderClient, InitiateAuthCommand, AuthFlowType } from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { auth } from "../../auth/resource";
// Initialize AWS Cognito client
const cognito = new CognitoIdentityProviderClient();

const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

export const handler: APIGatewayProxyHandler = async (event) => {
    // Parse the JSON body to get the user's credentials
    let requestBody;
    try {
        requestBody = JSON.parse(event.body || "{}");
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify("There is missing field(s) in the AuthenticationRequest or it is formed improperly.")
        };
    }

    const { User, Secret } = requestBody;
    if (!User || !Secret || !User.name || !Secret.password || typeof User.isAdmin !== "boolean") {
        return {
            statusCode: 400,
            body: JSON.stringify("There is missing field(s) in the AuthenticationRequest or it is formed improperly.")
        };
    }
    try {
        // Authenticate the user with AWS Cognito
        const authParams = {
            AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
            ClientId: USER_POOL_CLIENT_ID,
            AuthParameters: {
                USERNAME: User.name,
                PASSWORD: Secret.password,
            },
        };
        console.log("AuthParams: ", authParams);
        const authCommand = new InitiateAuthCommand(authParams);
        let authResponse;
        try {
            authResponse = await cognito.send(authCommand);
        } catch (error) {
            console.log("Error during authentication:", error);
            return {
                statusCode: 402,
                body: JSON.stringify(`The user or password is invalid. ${error}`),
            }
        }
        console.log("AuthResponse Return: ", authResponse)

        // Return the JWT token if authentication is successful
        const idToken = authResponse.AuthenticationResult?.IdToken;
        if (idToken) {
            console.log(`${idToken}`)
            return {
                statusCode: 200,
                body: JSON.stringify(`bearer ${idToken}`),
            };
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify("The user or password is invalid."),
            };
        }
    } catch (error) {
        if ((error as any).name === "NotAuthorizedException") {
            return {
                statusCode: 401,
                body: JSON.stringify("The user or password is invalid."),
            };
        }
        console.error("Error during authentication:", error);
        return {
            statusCode: 501,
            body: JSON.stringify({ message: "Error during authentication.", error: (error as any).message }),
        };
    }
};
