import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import AdmZip from "adm-zip";
import { Readable } from "stream";


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

  // get httpMethod from path parameter
  const httpMethod = event.pathParameters?.httpMethod;

  // Handle POST request
  if (httpMethod === "POST") {
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
    const { Name, Version, ID, Content, URL, debloat, JSProgram } = requestBody;

    // Validate that either "Content" or "URL" is present, but not both
    if ((Content && !URL) || (!Content && URL)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)" }),
        };
    }

    // TODO: implement JSProgram rule

    // Check if package exists in S3 already
    try {
        const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: Name,
        });

        await s3.send(command);

    } catch (error) {
        if (error instanceof Error && (error as any).code === "NotFound") {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Package does not exists." }),
            };
        } else { 
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Error checking for existing package" }),
            };
        }
    } 

    // Decode base64 'Content' to binary buffer (zip file)
    const zipBuffer = Buffer.from(Content, "base64");

    // Unzip the Content
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

    // Update metric calculation

    // update metadata in dynamoDB

    // Upload the package to S3

    //return
    return {
        statusCode: 200,
        // Modify the CORS settings below to match your specific requirements
        headers: {
            "Access-Control-Allow-Origin": "*", // Restrict this to domains you trust
            "Access-Control-Allow-Headers": "*", // Specify only the headers you need to allow
        },
        body: JSON.stringify("Hello from myFunction!"),
    };
  }

  // Handle GET request
  if (httpMethod === "GET") {
    // get package ID from path parameter
    // const packageID = event.pathParameters?.packageID;

    // Parse the JSON body to see if it exists
    let requestBody;
    try {
        requestBody = JSON.parse(event.body || "{}");
    } catch (error) {
        console.log("can't parse request body");
        return {
            statusCode: 400,
            body: JSON.stringify("There is missing field(s) in the PackageData or it is formed improperly, or is invalid."),
        };
    }

    // get JSON Body
    const { packageID } = requestBody;

    if (!packageID) {
        console.log("can't find packageID");
      return {
        statusCode: 400,
        body: JSON.stringify("There is missing field(s) in the PackageID or it is formed improperly, or is invalid."),
      };
    }

    // Check if package exists in S3
    try {
        const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: packageID,
        });

        const response = await s3.send(command);

        // Convert the response Body (stream) into a string
        const streamToString = (stream: Readable): Promise<string> =>
            new Promise((resolve, reject) => {
                const chunks: Uint8Array[] = [];
                stream.on("data", (chunk) => chunks.push(chunk));
                stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
                stream.on("error", reject);
            });

        const fileContent = await streamToString(response.Body as Readable);

        const version = response.Metadata?.Version;
        const fileName = response.Metadata?.Name;

        // return package
        return {
            statusCode: 200,
            // Modify the CORS settings below to match your specific requirements
            headers: {
            "Access-Control-Allow-Origin": "*", // Restrict this to domains you trust
            "Access-Control-Allow-Headers": "*", // Specify only the headers you need to allow
            },
            body: JSON.stringify({
                Metadata: {
                    Name: fileName,
                    Version: version,
                    ID: packageID,
                },
                data: {
                    Content: fileContent,
                    JSProgram: expect.any(String),
                },
            }),
        };

    } catch (error) {
        if (error instanceof Error && (error as any).name === "NotFound") {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Package does not exist." }),
            };
        } else { 
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Error checking for existing package" }),
            };
        }
    } 
  }

  // Return a default response if no conditions are met
  return {
    statusCode: 400,
    body: JSON.stringify({ error: "Unsupported method or missing fields." }),
  };
};