import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";

// export const handler: APIGatewayProxyHandler = async (event) => {
//     // Your logic for handling the /tracks endpoint
//     const body = event.body ? JSON.parse(event.body) : {};

//     return {
//         statusCode: 200,
//         body: JSON.stringify({ 
//             "plannedTracks": [
//                 "Access control track"
//             ]
//         }),
//     };
// };
export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        // Parse the JSON body if present
        const body = event.body ? JSON.parse(event.body) : {};
        // Your logic for handling the /tracks endpoint
        // You can now use the 'body' object to access any JSON data sent in the request
        return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
            "plannedTracks": [
            "Access control track"
            ]
        }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
        statusCode: 400,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: "Invalid request body" }),
        };
    }
};
