import { defineFunction } from '@aws-amplify/backend';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { CognitoJwtVerifier } from 'aws-jwt-verify'; // Cognito JWT verification library
    
const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        try {
            const dynamoDB = new DynamoDBClient({});
            const { id } = event.pathParameters || {};
            const authToken = event.headers['X-Authorization'];

            // Validate required path and header parameters
            if (!id) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Missing field: PackageID' }),
                };
            }

            if (!authToken) {
                return {
                    statusCode: 403,
                    body: JSON.stringify({ error: 'Missing or invalid AuthenticationToken' }),
                };
            }

            // Validate authentication token with Cognito
            const isValidAuth = await validateAuthToken(authToken);
            if (!isValidAuth) {
                return {
                    statusCode: 403,
                    body: JSON.stringify({ error: 'Authentication failed' }),
                };
            }

            // Fetch package rating from DynamoDB
            const command = new GetItemCommand({
                TableName: process.env.PACKAGE_TABLE_NAME!,
                Key: {
                    PackageID: { S: id },
                },
            });
                    const result = await dynamoDB.send(command);
    
                    if (!result.Item) {
                        return {
                            statusCode: 404,
                            body: JSON.stringify({ error: 'Package does not exist' }),
                        };
                    }
    
                    // Assume PackageRating is stored as a JSON object in DynamoDB
                    const packageRating = result.Item.PackageRating?.S;
    
                    if (!packageRating) {
                        return {
                            statusCode: 500,
                            body: JSON.stringify({ error: 'Failed to compute one or more metrics' }),
                        };
                    }
    
                    return {
                        statusCode: 200,
                        body: packageRating,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    };
                } catch (error) {
                    console.error('Error fetching package rating:', error);
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ error: 'Internal Server Error' }),
                    };
                }
            };
    
            export const apiPackageRate = defineFunction({
                name: 'api-package-id-rate',
            });
            
            export { handler as apiPackageRateHandler };


// Validate Cognito token
const validateAuthToken = async (token: string): Promise<boolean> => {
    try {
        const verifier = CognitoJwtVerifier.create({
            userPoolId: process.env.COGNITO_USER_POOL_ID!,
            tokenUse: 'access', // Validate an access token, can be 'id' or 'access'
            clientId: process.env.COGNITO_APP_CLIENT_ID!,
        });

        await verifier.verify(token);
        return true;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
};
