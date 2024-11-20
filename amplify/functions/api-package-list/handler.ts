import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import AdmZip from "adm-zip";


const s3 = new S3Client();
const BUCKET_NAME = "packageStorage";

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

  let performanceTracks = { plannedTracks: ["Access conrol track"] };

  return {
    statusCode: 200,
    // Modify the CORS settings below to match your specific requirements
    headers: {
      "Access-Control-Allow-Origin": "*", // Restrict this to domains you trust
      "Access-Control-Allow-Headers": "*", // Specify only the headers you need to allow
    },
    body: JSON.stringify(performanceTracks),
  };
};