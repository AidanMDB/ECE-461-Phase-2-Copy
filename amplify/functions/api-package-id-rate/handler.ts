import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import AdmZip from "adm-zip";

const s3 = new S3Client();
const BUCKET_NAME = "packageStorage";

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("event", event);

  
  // NEED TO CHECK IF CASE SENSITIVITY IS NEEDED TO BE CONSIDERED
  const headers = Object.fromEntries(
    Object.entries(event.headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  
  // check for 'X-authorization' header
  // const authHeader = event.headers["X-authorization"];
  const authHeader = event.headers["X-authorization"] || event.headers["x-authorization"]; 
  if (!authHeader) {
    return {
      statusCode: 403,
      body: JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
    };
  }
    // // Handle GET request
    // if (event.httpMethod === "GET") {
    //     const packageID = event.pathParameters?.id;
    //     if (!packageID) {
    //         return {
    //             statusCode: 400,
    //             body: JSON.stringify("There is missing field(s) in the PackageID."),
    //         };
    //     }

    // Handle GET request
    if(event.httpMethod !== "GET") {
      return {
        statusCode: 400,
        body: JSON.stringify("There is missing field(s) in the PackageID."),
      };
    }

    // Validate Package ID
  const packageID = event.pathParameters?.id;
  if (!packageID) {
    return {
      statusCode: 400,
      body: JSON.stringify("There is missing field(s) in the PackageID."),
    };
  }

  try {
    // Check if the package exists in S3
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: packageID,
    });

    await s3.send(command);

    // Return the rating (placeholder for actual metric calculations)
    const packageRating = {
      BusFactor: 0.8,
      Correctness: 0.9,
      RampUp: 0.7,
      ResponsiveMaintainer: 0.85,
      LicenseScore: 0.95,
      GoodPinningPractice: 0.9,
      PullRequest: 0.75,
      NetScore: 0.85,
    };

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Restrict this to trusted domains
        "Access-Control-Allow-Headers": "*", // Specify only required headers
      },
      body: JSON.stringify(packageRating),
    };
  } catch (error: any) {
    // Handle specific error scenarios
    if (error.name === "NotFound") {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Package does not exist." }),
      };
    }

    // Fallback to 500 for other errors
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "The package rating system choked on at least one of the metrics." }),
    };
  }
};

    // TODO: implement JSProgram rule

  //   // Check if package exists in S3 already
  //   const packageID = event.pathParameters?.id;
  //   try {
  //       const command = new HeadObjectCommand({
  //       Bucket: BUCKET_NAME,
  //       Key: packageID,
  //       });

  //       await s3.send(command);

  //       // Return the rating  --- placeholder for phase 1 metric rating calls
  //     const packageRating = {
  //       BusFactor: 0.8,
  //       Correctness: 0.9,
  //       RampUp: 0.7,
  //       ResponsiveMaintainer: 0.85,
  //       LicenseScore: 0.95,
  //       GoodPinningPractice: 0.9,
  //       PullRequest: 0.75,
  //       NetScore: 0.85,
  //     };

  //     return {
  //       statusCode: 200,
  //       headers: {
  //           "Access-Control-Allow-Origin": "*", // Restrict this to domains you trust
  //           "Access-Control-Allow-Headers": "*", // Specify only the headers you need to allow
  //       },
  //       body: JSON.stringify(packageRating),
  //     };
  //   } catch (error) {
  //       if (error.name === "NotFound") {
  //         return {
  //           statusCode: 404,
  //           body: JSON.stringify({ error: "Package does not exist." }),
  //         };
  //       } else {
  //         return {
  //           statusCode: 500,
  //           body: JSON.stringify({ error: "The package rating system choked on at least one of the metrics." }),
  //         };
  //       }
  //     }
  //   }
  
  //   // Return a default response if no conditions are met
  //   return {
  //     statusCode: 400,
  //     body: JSON.stringify({ error: "There is missing field(s) in the PackageID" }),
  //   };
  // };