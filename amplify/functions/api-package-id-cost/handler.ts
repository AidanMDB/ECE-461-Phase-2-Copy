import type { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";
import * as tar from "tar";
import * as fs from 'fs';

const s3 = new S3Client();
const dynamoDB = new DynamoDBClient();
const BUCKET_NAME = "packageStorage";
const TABLE_NAME = process.env.PACKAGES_TABLE || "packageTable";

/**
 * Given a list of dependencies, calculate the total cost of the dependencies
 * @param dependencyList a list of dependencies
 * @returns the total cost of the dependencies
 */
async function dependencyCost(dependencyList: string[]) {
    let totalCost = 0;
    for (const dependency of dependencyList) {
        const response = await axios.get(`https://registry.npmjs.org/${dependency}/latest`);
        totalCost += response.data?.dist.unpackedSize || 0;
    }
    return totalCost;
}

/**
 * Given a package name, get the first-level dependencies of the package
 * @param packageName the name of the package to get the dependency from
 * @returns the dependencies of the package
 */
async function getFirstLevelDependencies(packageName: string) {
    const response = await axios.get(`https://registry.npmjs.org/${packageName}/latest`);
    return response.data.dependencies || {};
}

export const handler: APIGatewayProxyHandler = async (event) => {
    // Check for authorization header
    const authHeader = event.headers["X-Authorization"];
    if (!authHeader) {
        return {
            statusCode: 403,
            body: JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
        };
    }

    // Retrieve the id of the package
    const id = event.pathParameters?.id;
    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify("There is missing field(s) in the PackageID")
        };
    }

    // Default to false if dependency flag is not provided
    const dependency = Boolean(event.queryStringParameters?.dependency);

    // Check if the package exists in S3
    try {
        const command = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: id
        });
        await s3.send(command);  // This will throw an error if the package does not exist
    } catch (error) {
        return {
            statusCode: 404,
            body: JSON.stringify("Package does not exist.")
        };
    }

    // Retrieve package dependencies from DynamoDB
    let packageDep;
    try {
        const params = {
            TableName: TABLE_NAME,
            Key: {
                id
            }
        };
        const command = new GetCommand(params);
        const response = await dynamoDB.send(command);
        packageDep = response.Item?.packageDep;
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify("The package rating system choked on at least one of the metrics.")
        };
    }

    // If packageDep is null or undefined, return a default message
    if (!packageDep) {
        return {
            statusCode: 404,
            body: JSON.stringify("Package dependencies not found.")
        };
    }

    // Parse dependencies into JSON
    const dependencyJSON = JSON.parse(packageDep);

    // Iterate over dependencies and fetch further details
    for (const dep in dependencyJSON) {
        const dependency_name = dep;
        const dependency_version = dependencyJSON[dep];

        // Get package information from npm registry
        const response = await axios.get(`https://registry.npmjs.org/${dependency_name}/${dependency_version}`);

        // Extract tarball URL and download the tarball
        const tarballUrl = response.data.dist.tarball;
        const tarballResponse = await axios.get(tarballUrl, { responseType: 'arraybuffer' });

        const path = `/tmp/${dependency_name}.tgz`;
        fs.writeFileSync(path, tarballResponse.data);

        // Extract the package.json file from the tarball
        const packageJsonPath = '/tmp/package.json';
        await tar.x({
            file: path,
            C: '/tmp',
            onentry: (entry: tar.ReadEntry) => {
                if (entry.path === 'package/package.json') {
                    entry.pipe(fs.createWriteStream(packageJsonPath));
                }
            }
        });

        const packageJson = require(packageJsonPath);

        // Get the dependencies from package.json
        const dependencies = packageJson.dependencies;

        // Add new dependencies to the list
        for (const depName in dependencies) {
            if (!dependencyJSON[depName]) {
                dependencyJSON[depName] = dependencies[depName];
            }
        }
    }

    // Calculate the total cost of the dependencies
    let packageCosts;
    if (dependency) {
        const dependencyList = await getFirstLevelDependencies(id);  // Fetch first-level dependencies
        packageCosts = await dependencyCost(Object.keys(dependencyList));  // Get cost of dependencies
    } else {
        packageCosts = await dependencyCost([id]);  // Get cost for just the package itself
    }

    return {
        statusCode: 200,
        body: JSON.stringify(packageCosts)
    };
};
