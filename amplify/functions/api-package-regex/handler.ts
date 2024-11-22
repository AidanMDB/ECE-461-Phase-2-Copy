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

  /*
  *   This is a simple search function that searches for a package based on the regex provided
  *   Example requestBody: { "RegEx": "regex" }
  *   Example response: { "Version": "1.0.0", "Name": "package-name", "ID": "package-id" }
  *   
  *   The FilterExpression uses the contains function to check if the Name or Readme attributes 
  *     contain the substring specified by the RegEx value.
  */
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
    // May need to modify this dynamoDb scan based on how they are stored
    const result = await dynamoDb.send(new ScanCommand(params));
    if (result.Items && result.Items.length > 0) {
      const formattedItems = result.Items.map(item => ({
        Version: item.Version.S,
        Name: item.Name.S,
        ID: item.ID.S,
      }));
        return {
            statusCode: 200,
            //body: JSON.stringify(result.Items),
            body: JSON.stringify(formattedItems),
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