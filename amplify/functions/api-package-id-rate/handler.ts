import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import AdmZip from "adm-zip";

const s3 = new S3Client();
const dynamoDB = new DynamoDBClient();
const BUCKET_NAME = "packageStorage";
const TABLE_NAME = process.env.PACKAGES_TABLE || "packageTable";

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("event", event);

  // check for 'X-authorization' header
  const authHeader = event.headers["X-authorization"] || event.headers["x-authorization"]; 
  if (!authHeader) {
    return {
      statusCode: 403,
      body: JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
    };
  }

  // Handle GET request
  if(event.httpMethod !== "GET") {
    return {
      statusCode: 400,
      body: JSON.stringify({error: "There is missing field(s) in the PackageID."}),
    };
  }

  // Validate Package ID
  const packageID = event.pathParameters?.id;
  if (!packageID) {
    return {
      statusCode: 400,
      body: JSON.stringify({error: "There is missing field(s) in the PackageID."}),
    };
  }

  try {
    // Check if the package exists in S3
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: packageID,
    });
    await s3.send(command);
  } catch (error: any) {
    // Handle specific error scenarios
    if (error.name === "NotFound") {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Package does not exist." }),
      };
    }
  }

  // retrieve rating from dynamoDB
  let packageRating;
  try {
    const getItemCommand = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        packageID: { S: packageID },
      },
    });
    const data = await dynamoDB.send(getItemCommand);
    packageRating = data.Item?.rating?.N;
    console.log("packageRating", packageRating);
  } catch (error) { // check this error !!!!!!
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "The package rating system choked on at least one of the metrics." }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*", // Restrict this to trusted domains
      "Access-Control-Allow-Headers": "*", // Specify only required headers
    },
    body: JSON.stringify(packageRating),
  };
};