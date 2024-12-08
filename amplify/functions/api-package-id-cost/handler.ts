import type { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";

const s3 = new S3Client();
const dynamoDB = new DynamoDBClient();
const BUCKET_NAME = "packageStorage";
const TABLE_NAME = process.env.PACKAGES_TABLE || "packageTable";

/**
 * given a list of dependencies, calculate the total cost of the dependencies
 * @param dependencyList a list of dependencies
 * @returns the total cost of the dependencies
 */
async function dependencyCost(dependencyList: string[]) {
    let totalCost = 0;
    // create a for loop that gets each dependency in the list get the size of the package
    for (const dependency of dependencyList) {
        const response = await axios.get(`https://registry.npmjs.org/${dependency}/latest`);
        totalCost += response.data?.dist.unpackedSize;
    }
    return totalCost;
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
    const authHeader = event.headers["X-Authorization"];
    if(!authHeader) {
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
            body: JSON.stringify("There is missing field(s) in the PackageID")
        };
    }

    let dependency = false; // default to false
    dependency = Boolean(event.queryStringParameters?.dependency);

    // check if the package exists in S3
    try {
        const command = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `${id}`
        });
        const response = await s3.send(command);

        // get package size !!!!!!!!!!!!!!!!!!
    } catch (error) {
        return {
            statusCode: 404,
            body: JSON.stringify("Package does not exist.")
        }
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
        const response = await dynamoDB.send(command);

        // get a list of dependencies
        packageDep = response.Item?.packageDep;
    } catch (error:any) {
        return {
            statusCode: 500,
            body: JSON.stringify("The package rating system choked on at least one of the metrics.")
        }
    }

    // parse dependencies into JSON
    const dependencyJSON = JSON.parse(packageDep);
    for (const dep in dependencyJSON) {
        let dependency_name = dep;
        let dependency_version = dependencyJSON[dep];

        // get the package information from npm registry
        const response = await axios.get(`https://registry.npmjs.org/${dependency_name}/${dependency_version}`);

        // get the tarball url

        // download the tarball and write it to '/tmp' directory in lambda

        // get the size of the tarball

        // extract the package.json file from the tarball

        // get the dependencies from the package.json file

        // check if dependency is already in dependencyJSON
    }

    // get the cost of the dependencies ???????????????
    let packageCosts;
    if (dependency) {
        const dependencyList = await getFirstLevelDependencies(id);
        packageCosts = await dependencyCost(dependencyList);
    } else {
        packageCosts = await dependencyCost([id]);
    }

    // make some recursion function that downloads the tarball from registry.npmjs gets its size and then searches for dependencies and gets their size

    // go into dependency, add to packagejson, send package json to next function which calls that and gets tarbal, then finds tarball size


    return {
        statusCode: 200,
        body: JSON.stringify(packageCosts)
    };
}