import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

const dynamoDb = new DynamoDBClient();
const TABLE_NAME = process.env.PACKAGES_TABLE || "packageTable";

const s3 = new S3Client();
const BUCKET_NAME = "packageStorage";

export const handler: APIGatewayProxyHandler = async (event) => {
  // check for 'X-authorization' header
  const authHeader = event.headers["X-Authorization"];
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
  let versionType;
  let version;
  try {
    requestBody = JSON.parse(event.body || "{}"); 
    console.log("request body:",requestBody);
    version_body = requestBody.Version;

    // get version type
    if(version_body.includes("Tilde")) {
      versionType = "Tilde";
    }
    else if(version_body.includes("Bounded")) {
      versionType = "Bounded";
    }
    else if(version_body.includes("Carat")) {
      versionType = "Carat";
    }
    else {
      versionType = "Exact";
    }

    // parse version for version number(s)
    const regex = /\(([^)]+)\)/;
    const match = version_body.match(regex);
    version = match ? match[1] : null;
    name = requestBody.Name;
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify("There is missing field(s) in the PackageQuery or it is formed improperly, or is invalid.")
    };
  }

  let params;
  // check if name = * (should get all packages) 
  if(name === "*") {
    params = {
      TableName: TABLE_NAME,
      Limit: parseInt(offset),
      // Might need to add this later if we want to implement pagination
      //ExclusiveStartkey: event.queryStringParameters.LastEvaluatedKey ? JSON.parse(event.queryStringParameters.LastEvaluatedKey) : undefined,
    };
  }
  else {
    params = {
      TableName: TABLE_NAME,
      FilterExpression: 'contains(#name, :nameSubstring)', // AND contains(#version, :versionSubstring)',
      ExpressionAttributeNames: {
        '#name': name,
        // '#version': version,
      },
      Limit: parseInt(offset),
      // Might need to add this later if we want to implement pagination
      //ExclusiveStartkey: event.queryStringParameters.LastEvaluatedKey ? JSON.parse(event.queryStringParameters.LastEvaluatedKey) : undefined,
    };
  }

  let list: string | any[] = []
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

  // check versions in list
  for(let i = 0; i < list.length; i++) {
    if(versionType === "Exact") {
      if(list[i].Version !== version) {
        list.splice(i, 1);
        i--;
      }
    }
    else if(versionType === "Tilde") {
      const versionArr = version.split("~");
      const lowerBound = versionArr[1];

      // parse lower bound version
      let lower_bound_arr = lowerBound.split(".");
      let lower_bound_ver_1 = parseInt(lower_bound_arr[0]);
      let lower_bound_ver_2 = parseInt(lower_bound_arr[1]);

      // parse packages version
      const package_version = list[i].Version;
      let package_version_arr = package_version.split(".");
      let package_ver_1 = parseInt(package_version_arr[0]);
      let package_ver_2 = parseInt(package_version_arr[1]);

      if(!(package_ver_1 == lower_bound_ver_1 && package_ver_2 == lower_bound_ver_2)) {
        list.splice(i, 1);
        i--;
      }
    }
    else if(versionType === "Bounded") {
      const versionArr = version.split("-");
      const lowerBound = versionArr[0];
      const upperBound = versionArr[1];
      if(!(list[i].Version >= lowerBound && list[i].Version <= upperBound)) {
        list.splice(i, 1);
        i--;
      }
    }
    else if(versionType === "Carat") {
      const versionArr = version.split("^");
      const lowerBound = versionArr[0];
      if(!(list[i].Version >= lowerBound)) {
        list.splice(i, 1);
        i--;
      }
    }
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