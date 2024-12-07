import { CognitoIdentityProviderClient, AdminInitiateAuthCommand, AuthFlowType } from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { auth } from "../../auth/resource";
// Initialize AWS Cognito client
const cognito = new CognitoIdentityProviderClient();

const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

export const handler: APIGatewayProxyHandler = async (event) => {
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

    const { User, Secret } = requestBody;
    if (!User || !Secret || !User.name || !Secret.password) {
        return {
            statusCode: 400,
            body: JSON.stringify("Missing required fields: User.name and Secret.password")
        };
    }

    try {
        // Authenticate the user with AWS Cognito
        const authParams = {
            AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH,
            UserPoolId: USER_POOL_ID,
            ClientId: USER_POOL_CLIENT_ID,
            AuthParameters: {
                USERNAME: User.name,
                PASSWORD: Secret.password,
            },
        };

        const authCommand = new AdminInitiateAuthCommand(authParams);
        const authResponse = await cognito.send(authCommand);

        // Return the JWT token if authentication is successful
        const idToken = authResponse.AuthenticationResult?.IdToken;
        if (idToken) {
            return {
                statusCode: 200,
                body: JSON.stringify({ token: idToken }),
            };
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify("The user or password is invalid."),
            };
        }
    } catch (error) {
        console.error("Error during authentication:", error);
        return {
            statusCode: 501,
            body: JSON.stringify({ message: "Error during authentication.", error: (error as any).message }),
        };
    }
};