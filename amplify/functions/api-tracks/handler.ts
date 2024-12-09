import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";

export const handler: APIGatewayProxyHandler = async (event) => {
    // Your logic for handling the /tracks endpoint
    return {
        statusCode: 200,
        body: JSON.stringify({ 
            plannedTracks: [
                "" 
            ]
        }),
    };
};