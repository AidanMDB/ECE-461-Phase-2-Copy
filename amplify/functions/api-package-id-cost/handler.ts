import type { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";

const db = new DynamoDBClient({});
const dynamoClient = DynamoDBDocumentClient.from(db);
const s3 = new DynamoDBClient({});
const BUCKET_NAME = "packageStorage";

/**
 * given a list of dependencies, calculate the total cost of the dependencies
 * @param dependencyList a list of dependencies
 * @returns the total cost of the dependencies
 */
async function dependencyCost(dependencyList: string[]) {
    let totalCost = 0;
    // create a for loop that gets each dependency in the list get the size of the package
    const response = await axios.get(`https://registry.npmjs.org/${}/${}`);
    totalCost += response.data?.dist.unpackedSize;
}

/**
 * given a package name, get the dependencies of the package
 * (need to see if I can get them without needing to install the package)
 * @param packageName the name of the package to get the dependency from
 * @returns the dependencies of the package
 */
async function getFirstLevelDependencies(packageName: string) {
    const response = await axios.get(`https://registry.npmjs.org/${packageName}/latest`);
    const dependencies = response.data.dependencies;
    return dependencies;
}


export const handler: APIGatewayProxyHandler = async (event) => {
    // check for auth header
    try {
        const authHeader = event.headers["X-authorization"];
        console.log("authHeader", authHeader);
        } catch (error) {
        return {
            statusCode: 403,
            body: JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
        };
    }

    // retrieve the id of the package
    const id = event.pathParameters?.id;
    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify("There is missing fields in the PackageID.")
        };
    }

    const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${id}`
    });
    
    const response = await s3.send(command);

    const dependency = event.queryStringParameters?.dependency;
    if (dependency) {
        return {
            statusCode: 400,
            body: JSON.stringify("There is missing fields in the Dependency.")
        };
    }

    // retrieve package dependencies from DynamoDB
    let packageDep;
    try {
        const params = {
            TableName: process.env.TABLE_NAME,
            Key: {
                id: id
            }
        };
        const command = new GetCommand(params);
        const response = await dynamoClient.send(command);
        if (response.$metadata.httpStatusCode !== 200) {
            return {
                statusCode: 404,
                body: JSON.stringify("Package does not exist.")
            }
        }
        packageDep = response.Item?.packageDep;

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify("Error fetching data from DynamoDB.")
        }
    }


    let packageCosts = {};

    // make some recursion function that downloads the tarball from registry.npmjs gets its size and then searches for dependencies and gets their size

    const dependencyJSON = JSON.parse(packageDep);
    
    Object.






    return {
        statusCode: 200,
        body: JSON.stringify("Hello from Lambda!")
    };
}