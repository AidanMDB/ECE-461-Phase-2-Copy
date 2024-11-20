import type { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const dynamoDb = new DynamoDBClient();
const TABLE_NAME = process.env.PACKAGES_TABLE || "PackagesTable";

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("event", event);

  // check for 'X-authorization' header
  const authHeader = event.headers["X-authorization"];
  if (!authHeader) {
    return {
      statusCode: 403,
      body: JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
    };
  }

  // Parse the JSON body to see if it exists
  let requestBody;
  try {
    requestBody = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify("Invalid request body")
    };
  }

  const { RegEx } = requestBody;

  if (!RegEx) {
    return {
      statusCode: 400,
      body: JSON.stringify("Missing required field: RegEx")
    };
  }

  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'contains(#name, :regex) OR contains(#readme, :regex)',
    ExpressionAttributeNames: {
      '#name': 'Name',
      '#readme': 'Readme',
    },
    ExpressionAttributeValues: {
      ':regex': { S: RegEx },
    },
    Limit: 10,
    // Might need to add this later if we want to implement pagination
    //ExclusiveStartkey: event.queryStringParameters.LastEvaluatedKey ? JSON.parse(event.queryStringParameters.LastEvaluatedKey) : undefined,
  };

  try {
    const result = await dynamoDb.send(new ScanCommand(params));
    if (result.Items && result.Items.length > 0) {
        return {
            statusCode: 200,
            body: JSON.stringify(result.Items),
        };
    } else {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'No package found under this regex' }),
        };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not search packages' }),
    };
  }
};