import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { calcMetrics } from './metrics_src/api-metric-caller';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { error } from "console";
import { Schema } from '../../data/resource';
import { generateClient } from "aws-amplify/data";
import { Amplify } from "aws-amplify";
import StreamZip from "node-stream-zip";
import fs from "fs";

const s3 = new S3Client();
const BUCKET_NAME = "packageStorage";

export const handler: APIGatewayProxyHandler = async (event) => {
  //console.log("event", event);

  // check for 'X-authorization' header           
  try {
    const authHeader = event.headers["X-authorization"];
    console.log("authHeader", authHeader);
  } catch (error) {
    return {
      statusCode: 403,
      body: JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
    };
  }

  // Parse the JSON body to see if it exists
  let requestBody;
  try {
    requestBody = JSON.parse(event.body || "{}");
    console.log("requestBody", requestBody);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify("There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)")
    };
  }

  // get JSON Body
  const { Content, URL, JSProgram, debloat, Name } = requestBody;
  // Validate that either "Content" or "URL", debloat, Name, JSProgram            handled by backend.ts  (check error codes match)
  if (requestBody.hasOwnProperty("Content") && requestBody.hasOwnProperty("URL")) {
    return {
      statusCode: 400,
      body: JSON.stringify("There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)")
    };
  }

  if (!requestBody.hasOwnProperty("JSProgram") || !requestBody.hasOwnProperty("debloat") || !requestBody.hasOwnProperty("Name")) {
    return {
      statusCode: 400,
      body: JSON.stringify("There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)")
    };
  }

  // TODO: implement JSProgram rule



  let packageName, packageVersion, repositoryURL, zipBuffer;
  // Extract package.json file
  if (Content != null) {

    const zipPath = "/tmp/uploaded.zip";
    fs.writeFileSync(zipPath, Content);

    //get entires of zip file
    const zip = new StreamZip.async({ file: zipPath });
    const entries = await zip.entries();

    // get package.json from zip file
    const packageJsonEntry = Object.keys(entries).find(entry => entry.endsWith('package.json'));

    if (!packageJsonEntry) {
      await zip.close();
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Failure in extracting package.json from content" }),
      }
    }


    //Unzip the package.json file
    const stream = await zip.stream(packageJsonEntry)
    let data = '';
    stream.on('data', chunk => {
        data += chunk;
    });

    stream.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        packageName = jsonData.name;
        packageVersion = jsonData.version;
        repositoryURL = jsonData.repository?.url;
      
        console.log("PackageName", packageName);
        console.log("PackageVersion", packageVersion);
        console.log("RepositoryURL", repositoryURL);
      } catch (e) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Failure in extracting json data from package.json" }),
        };
      }
    });


  } else if (URL){
    // Extract package.json from URL
    try {
      console.log("URL", URL);

    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Failure in extracting package.json from URL" }),
      };
    }
  }


  // Check if package exists in S3 already
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `package/${packageName}${packageVersion}`,
    });

    await s3.send(command);

    return {
        statusCode: 409,
        body: JSON.stringify({ error: "Package exists already." }),
    }
  } catch (error) {
    // If the error is something other than "NotFound", then it's an unexpected error
    console.log("error: ", error);
    console.log("error type: ", typeof error);
    if (error instanceof Error) {
      if (!error.toString().includes("NotFound")) {
        return {
          statusCode: 500,
          body: JSON.stringify(`Error checking for existing package: ${error.toString()}`),
        };
      } 
    } 
    else {
      return {
        statusCode: 500,
        body: JSON.stringify(`"Error checking for existing package its not returning an error" ${error}`),
      };
    }
    // If errors is "NotFound" continue as normal
  }


  // Calculate metric's
  let metrics;
  try {
    const metricsResult = await calcMetrics(URL);
    metrics = JSON.parse(metricsResult);
  } catch(error) {
    return {
      statusCode: 500,
      body: JSON.stringify(`Error calculating metrics: ${error}`),
    };
  }

  // check if URL is disqualified
  if (URL && metrics.BusFactor < 0.5 && metrics.Correctness < 0.5 && metrics.RampUp < 0.5 && metrics.ResponsiveMaintainer < 0.5 && metrics.LicenseScore < 0.5 && metrics.VersionPinning < 0.5 && metrics.PullRequest < 0.5) {
    return {
      statusCode: 424,
      body: JSON.stringify({ error: "Package not uploaded due to the disqualified rating" }),
    };
  }

  // add metadata to bynamoDB
  const client = new DynamoDBClient({});
  const dynamo = DynamoDBDocumentClient.from(client);
  const packageTable = "Package";
  const rateTable = "PackageRating";

  try {
    // create and send Package table for package
    const putCommand = new PutCommand({
      TableName: packageTable,
      Item: {
        ID: `${packageName}${packageVersion}`,
        Name: Name,
        ReadME: "ReadME",
        Version: packageVersion,
        JSProgram: JSProgram || null,
        S3Location: "s3"                //TODO
      }
    });

    await dynamo.send(putCommand);

    // create and send Rating table for package
    const putCommandRate = new PutCommand({
      TableName: rateTable,
      Item: {
      package: `${packageName}${packageVersion}`,
      ID: `${packageName}${packageVersion}`,
      BusFactor: metrics.BusFactor,
      BusFactorLatency: metrics.BusFactorLatency,
      Correctness: metrics.Correctness,
      CorrectnessLatency: metrics.CorrectnessLatency,
      RampUp: metrics.RampUp,
      RampUpLatency: metrics.RampUpLatency,
      ResponsiveMaintainer: metrics.ResponsiveMaintainer,
      ResponsiveMaintainerLatency: metrics.ResponsiveMaintainerLatency,
      LicenseScore: metrics.LicenseScore,
      LicenseScoreLatency: metrics.LicenseScoreLatency,
      GoodPinningPractice: metrics.VersionPinning,
      GoodPinningPracticeLatency: metrics.VersionPinningLatency,
      PullRequest: metrics.EngineeringProcess,
      PullRequestLatency: metrics.EngineeringProcessLatency,
      NetScore: metrics.NetScore,
      NetScoreLatency: metrics.NetScoreLatency
      }
    });

    await dynamo.send(putCommandRate);
  } catch (error) {
    console.log("error type: ", typeof error);
    return {
      statusCode: 500,
      body: JSON.stringify(`Error adding package to DynamoDB: ${error}`),
    };
  }
  
  // Upload the package to S3
  try {
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: `package/${packageName}${packageVersion}`,
      Body: zipBuffer,
      ContentType: "application/zip"
    }

    await s3.send(new PutObjectCommand(uploadParams));

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Success. Check the ID in the returned metadata for the official ID." }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error uploading package to S3" }),
    };
  }

/* 
  return {
    statusCode: 200,
    // Modify the CORS settings below to match your specific requirements
    headers: {
      "Access-Control-Allow-Origin": "*", // Restrict this to domains you trust
      "Access-Control-Allow-Headers": "*", // Specify only the headers you need to allow
    },
    body: JSON.stringify("Hello from myFunction!"),
  }; */
};