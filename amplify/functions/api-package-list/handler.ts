import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

const dynamoDb = new DynamoDBClient();
const TABLE_NAME = process.env.PACKAGES_TABLE || "packageTable";

const s3 = new S3Client();
const BUCKET_NAME = "packageStorage";

export const handler: APIGatewayProxyHandler = async (event) => {
  // check for 'X-authorization' header
  const authHeader = event.headers["X-authorization"];
  if (!authHeader) {
    return {
      statusCode: 403,
      body: JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
    };
  }

  // check for offset
  let offset = event.headers["offset"];
  if(!offset) {
    offset = "100";
  }

  // Parse the JSON body to see if it exists
  let requestBody;
  let version_body;
  let name;
  let version;
  try {
    requestBody = JSON.parse(event.body || "{}"); 
    console.log("request body:",requestBody);
    version_body = requestBody.Version;

    // parse version
    const regex = /\(([^)]+)\)/;
    const match = version_body.match(regex);
    version = match ? match[1] : null;

    console.log("version:", version);
    name = requestBody.Name;
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify("There is missing field(s) in the PackageQuery or it is formed improperly, or is invalid.")
    };
  }

  // get list of packages from dynamoDB
  // need to add version and name !!!
  let list: string | any[] = []
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'contains(#name, :regex) AND contains(#version, :regex)',
    ExpressionAttributeNames: {
      '#name': name,
      '#version': version,
    },
    Limit: parseInt(offset),
    // Might need to add this later if we want to implement pagination
    //ExclusiveStartkey: event.queryStringParameters.LastEvaluatedKey ? JSON.parse(event.queryStringParameters.LastEvaluatedKey) : undefined,
  };

  try {
    const result = await dynamoDb.send(new ScanCommand(params));

    if (result.Items && result.Items.length > 0) {
      const items = result.Items;

      list = items.map(item => ({
        Version: item.Version.S,
        Name: item.Name.S,
        ID: item.ID.S,
      }));
    } 
  } catch (error) {
    return {
        statusCode: 500,
        body: JSON.stringify({ error: error }),
    };
  }

  if((parseInt(offset) < list.length)) {
    return {
        statusCode: 413,
        // Modify the CORS settings below to match your specific requirements
        headers: {
          "Access-Control-Allow-Origin": "*", // Restrict this to domains you trust
          "Access-Control-Allow-Headers": "*", // Specify only the headers you need to allow
        },
        body: JSON.stringify("Too many packages returned."),
      };
  }
  return {
    statusCode: 200,
    // Modify the CORS settings below to match your specific requirements
    headers: {
      "Access-Control-Allow-Origin": "*", // Restrict this to domains you trust
      "Access-Control-Allow-Headers": "*", // Specify only the headers you need to allow
    },
    body: JSON.stringify(list),
  }; 
};