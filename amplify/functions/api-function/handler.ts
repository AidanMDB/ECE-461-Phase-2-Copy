import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
//import { env } from '$amplify/env/api-function';
import * as fs from 'fs';
import StreamZip from 'node-stream-zip';
import AdmZip from 'adm-zip';
import * as terser from 'terser';

const TMP_PATH = '/tmp';
const TABLE_NAME = 'Package';
const BUCKET_NAME = 'packageStorage';
const db = new DynamoDBClient({});
const s3 = new S3Client({});

interface PackageInfo {
    packageName: string;
    packageVersion: string;
    repositoryURL: string;
    packageDep: string;
    readme: string;
}

interface ErrorResponse {
    statusCode: number;
    body: string;
}


interface PackageDataBase {
    debloat: boolean;
    Name: string;
}

interface PackageDataWithContent extends PackageDataBase {
    Content: string;
    URL?: never;
}

interface PackageDataWithURL extends PackageDataBase {
    URL: string;
    Content?: never;
}

type PackageData = PackageDataWithContent | PackageDataWithURL;

function isPackageData(obj: any): obj is PackageData {
    // Check if the base properties are present
    if (typeof obj !== 'object' || obj === null) {
        console.log('Invalid PackageData: not an object');
        return false;
    }
  
    // Check required properties of PackageData
    if (typeof obj.debloat !== 'boolean' || typeof obj.Name !== 'string') {
        console.log('Invalid PackageData: missing debloat or Name');
        return false;
    }
  
    const hasContent = typeof obj.Content === 'string';
    const hasURL = typeof obj.URL === 'string';
    console.log(`only one of Content or URL is present: ${hasContent !== hasURL}`);
    return hasContent !== hasURL; // true if only one of Content or URL is present
}

function isErrorResponse(obj: any): obj is ErrorResponse {
    return typeof obj === 'object' && obj !== null && typeof obj.statusCode === 'number' && typeof obj.body === 'string';
}

async function extractPackageInfo(zipPath: string): Promise<PackageInfo|ErrorResponse> {
    try {
        console.log(`Extracting package info from ${zipPath}`);
        const zip = new StreamZip.async({ file: zipPath });
        const entries = await zip.entries();
        const packageJsonEntry = Object.keys(entries).find(entry => entry.endsWith('package.json'));
        const readMeEntry = Object.keys(entries).find(entry => entry.endsWith('README.md'));

        if (!packageJsonEntry) {
            return {
                statusCode: 400,
                body: 'No package.json found in the zip file',
            }
        }
        if (!readMeEntry) {
            return {
                statusCode: 400,
                body: 'No README.md found in the zip file',
            }
        }

        // extract data from package.json that is in the zip file
        const stream = await zip.stream(packageJsonEntry)
        let data = await new Promise<string>((resolve, reject) => {
        let content = '';
        stream.on('data', chunk => {
            content += chunk;
        });
        stream.on('end', () => resolve(content));
        stream.on('error', reject);
        });

        // extract data from README.md that is in the zip file
        const streamReadMe = await zip.stream(readMeEntry)
        let readMeData = await new Promise<string>((resolve, reject) => {
        let contentReadMe = '';
        streamReadMe.on('data', chunk => {
            contentReadMe += chunk;
        });
        streamReadMe.on('end', () => resolve(contentReadMe));
        streamReadMe.on('error', reject);
        });

        const packageJSON = JSON.parse(data);
        const packageVersion = packageJSON.version? packageJSON.version : '1.0.0';
        const packageName = packageJSON.name;
        const packageDep = {...packageJSON.dependencies, ...packageJSON.devDependencies}; 
        let repositoryURL = packageJSON.repository.url ? packageJSON.repository.url : packageJSON.repository;
        
        // change the URL to a valid github URL if it is not already
        if (!repositoryURL || !packageVersion || !packageName) {
            console.log(`Repository URL: ${repositoryURL}, Package Version: ${packageVersion}, Package Name: ${packageName}`);
            return {
                statusCode: 400,
                body: `Repository, Version or Name not found in package.json; ${process.cwd()}`,
            };
        }
        if (repositoryURL.startsWith("git+")) {
                repositoryURL = repositoryURL.replace(/^git\+/, "").replace(/\.git$/, "");
        } else if (!repositoryURL.startsWith("https://")) {
            repositoryURL = `https://github.com/${repositoryURL}`;
        }

        return {
            packageName: packageName,
            packageVersion: packageVersion,
            repositoryURL: repositoryURL,
            packageDep: JSON.stringify(packageDep),
            readme: readMeData,
        };
    } catch (error) {
        console.log('Error extracting package info:', error);
        return {
            statusCode: 500,
            body: 'Error extracting package info',
        };
    }
}

async function checkKeyExists(packageName: string, packageVersion: string): Promise<undefined|ErrorResponse> {
    try {
        const params = {
            TableName: TABLE_NAME,
            Key: {
                ID: {S:`${packageName}${packageVersion}`},
            }
        };
    
        const command = new GetItemCommand(params);
        const response = await db.send(command);
    
        // Check if the 'Item' exists in the response
        if (!!response.Item) {    // True if 'Item' doesn't exist
            return {
                statusCode: 409,
                body: "Package exists already.",
            };
        } 
    } catch (error) {
        console.error("Error checking key existence:", error);
        return {
            statusCode: 500,
            body: "Error checking key existence",
        }
    }
}

async function validateToken(token:string): Promise<undefined|ErrorResponse> {
    // check if token is valid if not return 403
    try {
        if (token === "") {
            console.log('No token provided');
            return {
                statusCode: 403,
                body: "Authentication failed due to invalid or missing AuthenticationToken.",
            }
        }
    } catch (error) {
        console.error("Error validating token:", error);
        return {
            statusCode: 500,
            body: "Error validating token",
        }
    }
}

async function addPackageToDatabase(info: PackageInfo, rate: string): Promise<undefined|ErrorResponse> {
    try {
        const params = {
            TableName: TABLE_NAME,
            Item: {
                ID: {S: `${info.packageName}${info.packageVersion}`},
                Name: {S: info.packageName},
                Version: {S: info.packageVersion},
                Dependencies: {S: info.packageDep},
                Readme: {S: info.readme},
                Rating: {S: rate}
            }
        };
    
        const command = new PutItemCommand(params);
        const response = await db.send(command);
        if (response.$metadata.httpStatusCode !== 200) {
            console.log(`Error adding package to database: ${response.$metadata}`);
            return {
                statusCode: 500,
                body: "Error adding package to database",
            };
        }
    } catch (error) {
        console.error("Error adding package to database:", error);
        return {
            statusCode: 500,
            body: "Error adding package to database",
        };
    }
}

async function addPackageToS3(packageID: string, zipPath: string): Promise<undefined|ErrorResponse> {
    try {
        const data = fs.readFileSync(zipPath);
        const params = {
            Bucket: BUCKET_NAME,
            Key: packageID,
            Body: data,
            ContentType: "application/zip"
        };

        const command = new PutObjectCommand(params);
        const response = await s3.send(command);
        if (response.$metadata.httpStatusCode !== 200) {
            console.log(`Error adding package to S3: ${response.$metadata}`);
            return {
                statusCode: 500,
                body: "Error adding package to S3",
            };
        }
    } catch (error) {
        console.error("Error adding package to S3:", error);
        return {
            statusCode: 500,
            body: "Error adding package to S3",
        };
    }
}


/**
 * searches through a directory for all .js/.ts files and minifies them
 * @param directory - path to the directory containing the file(s) to debloat
 */
async function minifyZipInPlace(zipFilePath: string) {
    const zip = new AdmZip(zipFilePath);
  
    for (const entry of zip.getEntries()) {
        if (
            !entry.isDirectory &&
            (entry.entryName.endsWith('.js') || entry.entryName.endsWith('.ts'))
        ) {
            try {
                const originalCode = zip.readAsText(entry);
                const result = await terser.minify(originalCode);
  
                if (result.code !== undefined) {
                    zip.updateFile(entry.entryName, Buffer.from(result.code, 'utf8'));
                    console.log(`Minified and updated: ${entry.entryName}`);
                }
            } catch (err) {
                console.error(`Error minifying ${entry.entryName}:`, err);
            }
        }
    }
  
    // Write the updated zip back to disk
    zip.writeZip(zipFilePath);
    console.log('ZIP file updated successfully.');
}

async function parseContent(Content: String, Name:string): Promise<ErrorResponse|PackageInfo> {
    const contentBuffer = Buffer.from(Content, 'base64');
    const zipPath = `${TMP_PATH}/${Name}.zip`;
    fs.writeFileSync(zipPath, contentBuffer);

    const info = await extractPackageInfo(zipPath);
    if (isErrorResponse(info)) {
        return {
            statusCode: info.statusCode,
            body: info.body,
        }
    }
    return info;

}

export const handler: APIGatewayProxyHandler = async (event) => {

    try {
        const token = event.headers ? (event.headers["x-authorization"] || event.headers["X-Authorization"] || "") : "";
        const validResponse = await validateToken(token);
        if (validResponse) {
            return validResponse;
        }
        const data = JSON.parse(event.body || '{}');
        console.log('data:', data);
        console.log('data type:', typeof data);

        // verify that the body is a valid PackageData object
        if (!isPackageData(data)) {
            console.log('Invalid PackageData:');
            return {
                statusCode: 400,
                body: 'There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL are both set)',
            };
        }

        let info: PackageInfo|ErrorResponse;
        if (data.Content) {
            console.log('Request is Content');
            info = await parseContent(data.Content, data.Name);
            if (isErrorResponse(info)) {
                return {
                    statusCode: info.statusCode,
                    body: info.body,
                };
            }
        }
        else {
            info = {    
                packageName: "Name",
                packageVersion: "1.0.0",
                repositoryURL: "https://test",
                packageDep: "test",
                readme: "readme"
            };
        }
        
        // Check if the package already exists in the database
        const keyExists = await checkKeyExists(info.packageName, info.packageVersion);
        if (keyExists) {
            return keyExists;
        }

        // Calculate the rating of the package TODO
        const rating = {"test": 0};

        // Add the package to the database
        const packageAdded = await addPackageToDatabase(info, JSON.stringify(rating));
        if (packageAdded) {
            return packageAdded;
        }


        // Minify the package if requested
        if (data.debloat) {
            await minifyZipInPlace(`${TMP_PATH}/${data.Name}.zip`);
        }

        // Add the package to S3
        const s3Added = await addPackageToS3(`${info.packageName}${info.packageVersion}`, `${TMP_PATH}/${data.Name}.zip`);
        if (s3Added) {
            return s3Added;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                metadata: {
                    Name: info.packageName,
                    Version: info.packageVersion,
                    ID: `${info.packageName}${info.packageVersion}`,
                },
                data: {
                    Content: fs.readFileSync(`${TMP_PATH}/${data.Name}.zip`),
                }
            }),
        };

    } catch (error) {
        console.log('Error:', error);
        return {
            statusCode: 400,
            body: 'There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)',
        }
    }
};