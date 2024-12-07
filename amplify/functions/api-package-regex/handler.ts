import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import safeRegex from "safe-regex";

const dynamoDb = new DynamoDBClient();
const TABLE_NAME = process.env.PACKAGES_TABLE || "packageTable";

export const handler: APIGatewayProxyHandler = async (event) => {
  //console.log("event", event);

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
      body: JSON.stringify("There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid")
    };
  }

  const { RegEx } = requestBody;
  const { LastEvaluatedKey } = event.queryStringParameters || {};

  if (!RegEx) {
    return {
      statusCode: 400,
      body: JSON.stringify("There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid")
    };
  }

  // Validate the regex
  let regex;
  try {
    regex = new RegExp(RegEx);
    if (!safeRegex(regex)) {
      throw new Error("Unsafe regex pattern");
    }
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify("There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid")
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
      '#readme': 'ReadME',
    },
    ExpressionAttributeValues: {
      ':regex': { S: RegEx },
    },
    Limit: 100,
    // Might need to add this later if we want to implement pagination
    ExclusiveStartkey: LastEvaluatedKey ? JSON.parse(LastEvaluatedKey) : undefined,
  };

  try {
    // May need to modify this dynamoDb scan based on how they are stored
    const result = await dynamoDb.send(new ScanCommand(params));
    //console.log("Scan result:", result);

    if (result.Items && result.Items.length > 0) {
      //const regex = new RegExp(RegEx);
      const filteredItems = result.Items.filter(item => (item.Name.S && regex.test(item.Name.S)) || (item.ReadME.S && regex.test(item.ReadME.S)));
      //console.log("Filtered items:", filteredItems);
      const formattedItems = filteredItems.filter(Boolean).map(item => ({
        Version: item.Version.S,
        Name: item.Name.S,
        ID: item.ID.S,
      }));

      if (formattedItems.length != 0) {
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
    } else {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'No package found under this regex' }),
        };
    }
  } catch (error) {
    console.error("Error scanning DynamoDB:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not search packages' }),
    };
  }
};