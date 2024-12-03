import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import AdmZip from "adm-zip";
import { Readable } from "stream";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";


const s3 = new S3Client();
const BUCKET_NAME = "packageStorage";
const dynamoDB = new DynamoDBClient({});
const TABLE_NAME = process.env.PACKAGES_TABLE || "PackagesTable";

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("event", event);
  
  // check for 'X-authorization' header
  const authHeader = event.headers["X-authorization"];
  if (!authHeader) {
    return {
      statusCode: 403,
      body: JSON.stringify({error: "Authentication failed due to invalid or missing AuthenticationToken."})
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
        console.log("can't parse request body POST");
        return {
            statusCode: 400,
            body: JSON.stringify({error: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."})
        };
    }

    // get JSON Body
    const { Name, Version, ID, Content, URL, debloat, JSProgram } = requestBody;

    // Validate that either "Content" or "URL" is present, but not both
    if (Content && URL) {
        console.log("Content and url set");
        return {
            statusCode: 400,
            body: JSON.stringify({error: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."})
        };
    }

    // TODO: implement JSProgram rule

    // Check if package exists in S3 already
    try {
        const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: ID,
        });

        await s3.send(command);
    } catch (error) {
        if (error instanceof Error && (error as any).name === "NotFound") {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Package does not exist." }),
            };
        } 
        else { 
            console.log("Error checking if package exists in S3");
            console.log((error as any).name);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid." }),
            };
        }
    } 

    console.log("Line 80 :D");
    let repositoryURL;
    let zip = null;

    if (Content) {
        console.log("Content set");
        // Decode base64 'Content' to binary buffer (zip file)
        const zipBuffer = Buffer.from(Content, "base64");

        // Unzip the Content
        zip = new AdmZip(zipBuffer);

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
    }
    else if (URL) {
        console.log("URL set");
        repositoryURL = URL; 
        console.log("repositoryURL", repositoryURL);
        try {
            const response = await fetch(repositoryURL);
            console.log("response", response);
            const responseBody = await response.text();
            const zipBuffer = Buffer.from(responseBody);
            zip = new AdmZip(zipBuffer);
        } catch (error) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Failed to download package from URL." }),
            };
        }
    }

    // Update metric calculation

    // add new metadata in dynamoDB (version, name, id)?
    console.log("adding metadata to DynamoDB");
    try {
        const putItemCommand = new PutItemCommand({
            TableName: TABLE_NAME,
            Item: {
                Name: { S: Name },
                Version: { S: Version },
                ID: { S: ID },
                RepositoryURL: { S: repositoryURL },
            },
        });
        await dynamoDB.send(putItemCommand);
    } catch (error) {
        console.log("Error adding metadata to DynamoDB");
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid." }),
        };
    }

    // Upload the package to S3
    console.log("uploading package to S3");
    try {
        const putObjectCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: Name,
            Body: zip?.toBuffer(),
            Metadata: {
                Name: Name,
                Version: Version,
                ID: ID,
            },
        });
        await s3.send(putObjectCommand);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Error uploading file to S3." }),  // check if this is the correct error message
        };
    }

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
        console.log("can't parse request body GET");
        return {
            statusCode: 400,
            body: JSON.stringify({error: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."})
        };
    }

    // get JSON Body
    const { packageID } = requestBody;

    if (!packageID) {
        console.log("can't find packageID");
      return {
        statusCode: 400,
        body: JSON.stringify({error: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."})
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
              stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
              stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
              stream.on('error', reject);
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
                Body: JSON.parse(fileContent)
            }),
        };

    } catch (error) {
        if (error instanceof Error && (error as any).name === "NoSuchKey") {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Package does not exist." }),
            };
        } else { 
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid." }),
            };
        }
    } 
  }

  // Return a default response if no conditions are met
  return {
    statusCode: 400,
    body: JSON.stringify({error: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."})
};
};