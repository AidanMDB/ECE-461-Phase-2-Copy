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

  // Parse the JSON body to see if it exists
  let requestBody;
  try {
    requestBody = JSON.parse(event.body || "{}");

  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify("There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)")
    };
  }

  // get JSON Body
  const { Content, URL, JSProgram, debloat, Name } = requestBody;

  // Validate that either "Content" or "URL" is present, but not both
  if ((Content && !URL) || (!Content && URL)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)" }),
    };
  }

  // TODO: implement JSPorgram rule

  // Check if package exists in S3 already
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: Name,
    });

    await s3.send(command);

    return {
        statusCode: 409,
        body: JSON.stringify({ error: "Package exists already." }),
    }
  } catch (error) {
    
    if (error instanceof Error && (error as any).code === "NotFound") {
      // If the error is something other than "NotFound", then it's an unexpected error
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error checking for existing package" }),
      };
    }
    // If errors is "NotFound" continue as normal
  } 

  // Decode base64 'Content' to binary buffer (zip file)
  const zipBuffer = Buffer.from(Content, "base64");

  //Unzip the Content
  const zip = new AdmZip(zipBuffer);

  const packageJsonFile = zip.getEntry("package.json");

  // CHECK --->  Unsure if this is really needed I think we're allowed to assume package.json exists
  if (!packageJsonFile) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Package does not contain a package.json file." }),
    };

  }

  // Extract package.json file
  const packageJSON = JSON.parse(packageJsonFile.toString());
  const packageName = packageJSON.name;
  const repositoryURL = packageJSON.repository.url;
  console.log("PackageName", packageName);
  console.log("repositoryURL", repositoryURL);

  // Calculate metric

  // add metadata to bynamoDB

  // Upload the package to S3

  return {
    statusCode: 200,
    // Modify the CORS settings below to match your specific requirements
    headers: {
      "Access-Control-Allow-Origin": "*", // Restrict this to domains you trust
      "Access-Control-Allow-Headers": "*", // Specify only the headers you need to allow
    },
    body: JSON.stringify("Hello from myFunction!"),
  };
};