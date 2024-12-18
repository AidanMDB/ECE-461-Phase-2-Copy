import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import AdmZip from "adm-zip";

const s3 = new S3Client();
const dynamoDB = new DynamoDBClient();
const BUCKET_NAME = "amplify-dec29zvcbtyi8-mai-packagestoragebucketb9bb-glhgg0vatfdl ";
const TABLE_NAME = process.env.PACKAGES_TABLE || "Package-r47dvjzscnahxbruc73kdpqjt4-NONE";

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("event", event);

  // check for 'X-authorization' header
  const authHeader = event.headers["X-Authorization"] || event.headers["x-authorization"]; 
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
  } catch (error:any) { // check this error !!!!!!
    if (error.name === "NotFound") {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Package does not exist." }),
      };
    }
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