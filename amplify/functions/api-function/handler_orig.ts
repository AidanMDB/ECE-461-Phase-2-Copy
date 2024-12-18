import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { calcMetrics } from './metrics_src/api-metric-caller';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import axios from "axios";
import StreamZip from "node-stream-zip";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import * as tar from "tar";
//import unzipper from "unzipper";
import AdmZip from "adm-zip";
import * as terser from "terser";
//import esbuild from "esbuild";

const s3 = new S3Client();
const db = new DynamoDBClient({});
const dynamoClient = DynamoDBDocumentClient.from(db);

const BUCKET_NAME = "packageStorage";
export const TMP_PATH = "/tmp";

interface ErrorResult {
  statusCode: number;
  body: string;
}

interface SuccessResult {
  packageName: string;
  packageVersion: string;
  repositoryURL: any;
  packageDep: any;
  entryPoint: any;
  readMeData: string;
}

type ExtractPackageInfoResult = ErrorResult | SuccessResult;

function isErrorResult(result: ExtractPackageInfoResult): result is ErrorResult {
  return (result as ErrorResult).statusCode !== undefined;
}

/**
 * 
 * @param tableName - Package table name
 * @param key - key to check if it exists in the table
 * @returns True if the key exists in the table, false otherwise
 */
async function checkKeyExists(tableName: string, packageName:string, packageVersion:string): Promise<boolean> {
  try {
    const params = {
      TableName: tableName,
      Key: {
        ID: {S:`${packageName}${packageVersion}`},
      }
    };

    const command = new GetCommand(params);
    const response = await dynamoClient.send(command);

    // Check if the 'Item' exists in the response
    return !!response.Item; // True if 'Item' exists, false otherwise
  } catch (error) {
    console.error("Error checking key existence:", error);
    throw error;
  }
}

/**
 * Download a file from a URL and save it to a specified location
 * @param url - URL to download the file from
 * @param packageName - path for file to be downloaded to
 */
async function downloadFile(url: string, packageName: string) {
  const { data : gitZipStream} = await axios.get(url, { responseType: 'stream' });
  const zipFilePath = path.join(`${TMP_PATH}`, `${packageName}`);

  const zipFile = fs.createWriteStream(zipFilePath);
  await new Promise<void>((resolve, reject) => {
      gitZipStream.pipe(zipFile);
      zipFile.on('finish', () => {
          console.log(`File downloaded to ${zipFilePath}`);
          resolve();
      });
      zipFile.on('error', (err) => {
          console.log(`Error in downloading zip file: ${err}`);
          reject(err);
      });
  });

  return zipFilePath;
}

/**
 * Extract a zip file to a specified location
 * @param extractPath - path to extract the zip file to
 * @param filePath - path to the zip file
 * 
 */
/* async function extractZip(extractPath: string, filePath: string) {
  fs.mkdirSync(extractPath, { recursive: true });

  await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
          .pipe(unzipper.Extract({ path: extractPath }))
          .on('close', () => {
              console.log(`Zip file extracted to ${extractPath}`);
              resolve();
          })
          .on('error', (err) => {
              console.log(`Error in extracting zip file: ${err}`);
              reject(err);
          });
  });
} */


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




/**
 * @param packageJsonPath - path to the package.json file
 * @returns - object containing the package name, version, repository URL, and dependencies
 */
/* function extractPackageJSON(packageJsonPath: string) {
  const packageJSON = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let packageVersion = packageJSON.version? packageJSON.version : '1.0.0';
  let packageName = packageJSON.name
  let repositoryURL = packageJSON.repository.url ? packageJSON.repository.url : packageJSON.repository;
  let packageDep = {...packageJSON.dependencies, ...packageJSON.devDependencies}; 
  return {packageName, packageVersion, repositoryURL, packageDep};
} */

/**
 * Converts the .tgz file from NPM to a .zip file
 * @param tgzPath - path to the tgz file
 * @param outputZipPath - path to the output zip file
 */
async function convertTgzToZip(tgzPath: string, outputZipPath: string) {
  try{
    await tar.x({ file: tgzPath, cwd: `${TMP_PATH}`}).then(() => {});
    
    // Create a zip file from the extracted folder
    const zipFilePath = path.join(`${TMP_PATH}`, `${outputZipPath}`);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    return new Promise<void>((resolve, reject) => {
      output.on('close', () => {
        console.log(`Zip file created at ${zipFilePath}`);
        resolve();
      });
      output.on('error', (err) => {
        console.log(`Error in creating zip file: ${err}`);
        reject(err);
      });

      archive.on('error', (err) => {
        console.log(`Error in archiving: ${err}`);
        reject(err);
      });

      archive.pipe(output);
      archive.directory(`${TMP_PATH}/package`, false);
      archive.finalize().then(() => {
        fs.unlink(tgzPath, (err) => {
          if (err) {
              console.error(`Error in deleting tarball: ${err}`);
          }
          else {
              console.log(`Tarball deleted: ${tgzPath}`);
          }
        });
        // deletes the extracted folder
        try {
          fs.promises.rm(`${TMP_PATH}/package`, { recursive: true, force: true });
        } catch (error) {
          console.error(`Error deleting folder in tgzTOzip:`, error);
        } 
      }).catch(reject);
    });
  } catch (error) {
    console.log(`Error in converting tgz to zip: ${error}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error in converting tgz to zip" }),
    }
  } 
}


/**
 * gets the package information from the zip file
 * @param zipPath - path to the zip file
 * @returns jsonData - object containing the package name, version, repository URL, and dependencies
 * @returns readMeData - string containing the README.md file
 */
async function extractPackageInfo(zipPath: string) {
  let zip;
  try {
    // search for package.json in the zip file
    zip = new StreamZip.async({ file: zipPath });
    const entries = await zip.entries();
    const packageJsonEntry = Object.keys(entries).find(entry => entry.endsWith('package.json'));
    const readMeEntry = Object.keys(entries).find(entry => entry.endsWith('README.md'));

    if (!packageJsonEntry) {
      //console.log("package.json not found in the zip file");
      return {
        statusCode: 400,
        body: JSON.stringify("package.json not found in the zip file"),
      }
    }

    if (!readMeEntry) {
      //console.log("README.md not found in the zip file");
      return {
        statusCode: 400,
        body: JSON.stringify("README.md not found in the zip file"),
      };
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
    const packageName = packageJSON.name
    const entryPoint = packageJSON.main ? packageJSON.main : null;
    let repositoryURL = packageJSON.repository.url ? packageJSON.repository.url : packageJSON.repository;
    // change the URL to a valid github URL if it is not already
    if (repositoryURL !== undefined) {
      if (repositoryURL.includes("git+")) {
        repositoryURL = repositoryURL.replace(".git", "");
        repositoryURL = repositoryURL.replace("git+", "");
      }
      else {
        repositoryURL = `https://github.com/${repositoryURL}`;
      }
    }
    else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Repository not found in package.json" }),
      };
    }

    const packageDep = {...packageJSON.dependencies, ...packageJSON.devDependencies}; 
    console.log("packageVersion: ", packageVersion);

    return {
      jsonData : {packageName, packageVersion, repositoryURL, packageDep, entryPoint},
      readMeData
    };

  } catch (e) {
    console.log("Error in ExtractPackageInfo", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error in extractPackageInfo" }),
    }
  } finally {
    if (zip) {
      await zip.close();
    }
  }
}

/**
 * 
 * @param Content - base64 encoded string of the zip file
 * @param debloat - boolean to indicate whether to debloat the file
 * @returns - object containing the package name, version, repository URL, dependencies, entry point, and README.md file
 */
async function isContent(Content:string, Name:string, debloat:boolean): Promise<ExtractPackageInfoResult> {
  try {
    // write content to zip file
    console.log("entered content function", Content);
    const contentBuffer = Buffer.from(Content, 'base64');
    const zipPath = `${TMP_PATH}/${Name}.zip`;
    fs.writeFileSync(zipPath, contentBuffer);
    console.log("Content written to zip file at path:", zipPath);

    // extract package info from zip file
    const result = await extractPackageInfo(zipPath);
    console.log("isContent result:", result.jsonData);
    if (!result) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Failure in extracting package.json from content" }),
      };
    }
    if (result.statusCode) {
      return result;
    }
    if (!result.jsonData) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "jsonData not found in result" }),
      }
    }

    const {packageName, packageVersion, repositoryURL, packageDep, entryPoint} = result.jsonData;
    const readMeData = result.readMeData;

    // perform debloat if requested
    if (debloat) {
      await minifyZipInPlace(`${TMP_PATH}/${Name}.zip`);
    }

    return {
      packageName, 
      packageVersion, 
      repositoryURL, 
      packageDep, 
      entryPoint, 
      readMeData
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify(`Error in isContent ${error}`),
    };
  }
}

/**
 * 
 * @param URL - URL to the package
 * @param debloat - boolean to indicate whether to debloat the file
 * @returns - object containing the package name, version, repository URL, dependencies, entry point, and README.md file
 */
async function isNPM(packageName:string, packageVersion: string, Name:string, debloat:boolean): Promise<ExtractPackageInfoResult> {

  try {
    // get tarball URL
    const registryURL = `https://registry.npmjs.org/${packageName}/${packageVersion}`;
    const {data : packageData} = await axios.get(registryURL);
    console.log("PackageData: ", packageData);
    const tarballURL = packageData.dist.tarball;

    if (!tarballURL) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Failure in getting tarball url from npm" }),
      }
    }
    console.log(tarballURL)

    // replace latest with actual version
    if (packageVersion === 'latest') {
      packageVersion = `${packageData.version}`;
    }
    console.log(`npm package: ${packageName}, version: ${packageVersion}`);

    // download the tarball file from npm
    const filePath = await downloadFile(tarballURL, `${Name}.tgz`);

    if (!fs.existsSync(filePath)) {
        console.error(`Tarball file not found at path: ${filePath}`);
        return{
          statusCode: 400,
          body: JSON.stringify({ error: "Tarball file not found at expected location" }),
        };
    }

    // convert .tgz to .zip
    await convertTgzToZip(filePath, `${Name}.zip`);

    // extract package info from zip file
    const result = await extractPackageInfo(`${TMP_PATH}/${Name}.zip`);
    if (!result) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Failure in extracting package.json from npm" }),
      };
    }
    if (result.statusCode) {
      return result;
    }
    if (!result.jsonData) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "jsonData not found in result" }),
      }
    }

    const {repositoryURL, packageDep, entryPoint} = result.jsonData;
    packageVersion = result.jsonData.packageVersion;
    const readMeData = result.readMeData;

    // perform debloat if requested  TODO
    if (debloat) {
      minifyZipInPlace(`${TMP_PATH}/${Name}.zip`);
    }

    return {
      packageName, 
      packageVersion, 
      repositoryURL, 
      packageDep, 
      entryPoint, 
      readMeData
    };
  } catch (error) { 
    return {
      statusCode: 400,
      body: JSON.stringify(`Error in isNPM URL: ${error}`),
    }
  };
};

/**
 * 
 * @param packageOwner - Github owner of the package
 * @param packageName - Github name of the package
 * @param packageTree - branch of the package (optional)
 * @param debloat - boolean to indicate whether to debloat the file
 */
async function isGitHub(packageOwner:string, packageName:string, packageTree:string, Name:string, debloat:boolean): Promise<ExtractPackageInfoResult> {

  // get the default branch of the repository if none is provided
  try {
    if (packageTree === '') {
      const githubURL = `https://api.github.com/repos/${packageOwner}/${packageName}`;
      const {data: repoData} = await axios.get(githubURL)
      packageTree = repoData.default_branch;
    }

    // download the zip file from github
    const gitZipURL = `https://github.com/${packageOwner}/${packageName}/archive/refs/heads/${packageTree}.zip`;
    const filePath = await downloadFile(gitZipURL, `${Name}.zip`);

    if (!fs.existsSync(filePath)) {
      console.error(`github zip file not found at path: ${filePath}`);
      return {
        statusCode: 400,
        body: JSON.stringify("github zip file not found at expected location"),
      };
    }

    const result = await extractPackageInfo(filePath);
    if (!result) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Failure in extracting package.json from github" }),
      };
    }
    if (result.statusCode) {
      return result;
    }
    if (!result.jsonData) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "jsonData not found in result" }),
      }
    }
    const {packageVersion, repositoryURL, packageDep, entryPoint} = result.jsonData;
    const readMeData = result.readMeData;

    // perform debloat if requested  TODO
    if (debloat) {
      minifyZipInPlace(filePath);
    }

    return {
      packageName, 
      packageVersion, 
      repositoryURL, 
      packageDep, 
      entryPoint, 
      readMeData
    };
  
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Error in isGithub URL" }),
    }
  }
}




export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("event", event);

  // check for 'X-authorization' header           
  try {
    const authHeader = event.headers["X-Authorization"];
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
  // Validate that either "Content" or "URL", debloat, Name, JSProgram            handled by backend.ts  (check error codes match)
  if (requestBody.hasOwnProperty("Content") && requestBody.hasOwnProperty("URL")) {
    return {
      statusCode: 400,
      body: JSON.stringify("There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)")
    };
  }
  
  if (!requestBody.hasOwnProperty("debloat") || !requestBody.hasOwnProperty("Name")) {
    return {
      statusCode: 400,
      body: JSON.stringify("There is missing field(s) in the PackageData or it is formed improperly (e.g. Content and URL ar both set)")
    };
  }
  
  const { Content, URL, debloat, Name } = requestBody;



  let packageName, packageVersion, repositoryURL, packageDep, readMeData;
  // Extract package.json file
  if (Content != null) {
    const result = await isContent(Content, Name, debloat);

    // check if result is undefined
    if (isErrorResult(result)) {
      return {
        statusCode: result.statusCode,
        body: result.body,
      }
    }

    packageName = result.packageName;
    packageVersion = result.packageVersion;
    repositoryURL = result.repositoryURL;
    packageDep = result.packageDep;
    readMeData = result.readMeData;

  } else if (URL){
    // Extract package.json from URL
    try {
      // regex for npm and github url's
      const npmRegex = /https?:\/\/www\.npmjs\.com\/package\/([^\/@]+)(\/v\/)?(([^\/]+))?/;
      const githubRegex = /https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/;

      if (npmRegex.test(URL)) {

        // get package name and verison from npm URL
        const match = URL.match(npmRegex);
        packageName = match ? match[1] : '';
        packageVersion = match ? match[3] : 'latest';

        const result = await isNPM(packageName, packageVersion, Name, debloat);

        // check if result is undefined
        if (isErrorResult(result)) {
          return {
            statusCode: result.statusCode,
            body: result.body,
          }
        }

        packageVersion = result.packageVersion;
        repositoryURL = result.repositoryURL;
        packageDep = result.packageDep;
        readMeData = result.readMeData;

      }
      else if (githubRegex.test(URL)) {

        // get package name and verison from github URL
        const match = URL.match(githubRegex);
        let packageOwner = match ? match[1] : '';
        packageName = match ? match[2] : '';
        let packageTree = match && match[3] ? match[3] : '';

        const result = await isGitHub(packageOwner, packageName, packageTree, Name, debloat);
        
        // check if result is undefined
        if (isErrorResult(result)) {
          return {
            statusCode: result.statusCode,
            body: result.body,
          }
        }

        packageVersion = result.packageVersion;
        repositoryURL = result.repositoryURL;
        packageDep = result.packageDep;
        readMeData = result.readMeData;
      }
      else {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "URL is not a valid npm or github URL" }),
        }
      }

    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Error while parsing URL" }),
      };
    }
  }


  // Check if package exists already (uses dynamoDB)
  const packageTable = "Package";
  if (packageVersion === undefined) {
    return {
      statusCode: 400,
      body: JSON.stringify("Package version is undefined")
    }
  }

  const existence = await checkKeyExists(packageTable, packageName, packageVersion);
  if (existence) {
    return {
      statusCode: 409,
      body: JSON.stringify('Package exists already.')
    }
  }


  // Calculate metric's for the package
  let metrics;
  try {
    if (!repositoryURL) {
      return {
        statusCode: 424,
        body: JSON.stringify({ error: "Package not uploaded due to the disqualified rating (no github repo found)" }),
      };
    };
    const metricsResult = await calcMetrics(repositoryURL);
    metrics = JSON.parse(metricsResult);
    console.log(`Metrics: ${metrics}`);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify(`Error calculating metrics: ${error}`),
    };
  }

  // Check if URL is disqualified
  if (URL != null && metrics.BusFactor < 0.5 && metrics.Correctness < 0.5 && metrics.RampUp < 0.5 && metrics.ResponsiveMaintainer < 0.5 && metrics.LicenseScore < 0.5 && metrics.VersionPinning < 0.5 && metrics.PullRequest < 0.5) {
    return {
      statusCode: 424,
      body: JSON.stringify({ error: "Package not uploaded due to the disqualified rating" }),
    };
  }


  // add metadata to bynamoDB
  try {
    // create and send Package table for package
    const putCommand = new PutCommand({
      TableName: packageTable,
      Item: {
        ID: {S: `${packageName}${packageVersion}`},
        Name: {S: packageName},
        Version: {S: packageVersion},
        ReadME: {S: readMeData},
        Dependencies: {S: packageDep},
        Rating: {S: JSON.stringify(metrics)}
      }
    });

    const response = await dynamoClient.send(putCommand);
    if (response.$metadata.httpStatusCode !== 200) {
      return {
        statusCode: 500,
        body: JSON.stringify("Failed to add package to DynamoDB"),
      }
    }
    console.log("Package added to DynamoDB");
    
  } catch (error) {
    console.log("error type: ", typeof error);
    return {
      statusCode: 500,
      body: JSON.stringify(`Error while adding package to DynamoDB: ${error}`),
    };
  }
  
  // Upload the package to S3
  const zipPath = path.join(`${TMP_PATH}`, `${Name}.zip`);
  const fileContent = fs.readFileSync(zipPath);
  try {

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: `package/${packageName}${packageVersion}`,
      Body: fileContent,
      ContentType: "application/zip"
    }

    const response = await s3.send(new PutObjectCommand(uploadParams));
    if (response.$metadata.httpStatusCode !== 200) {
      return {
        statusCode: 500,
        body: JSON.stringify("Failed to upload package to S3"),
      };
    }
    console.log("Package uploaded to S3");
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(`Error while uploading package to S3: ${error}`),
    };
  }
  

  const responseBody: any = {
    metadata: {
      Name: `${packageName}`,
      Version: `${packageVersion}`,
      ID: `${packageName}${packageVersion}`,
    },
    data: {
      Content: fileContent,
    }
  }

  if (URL) {
    responseBody.data.URL = URL;
  }

  console.log("MetaData being Returned:", responseBody.metadata);
  return {
    statusCode: 201,
    body: JSON.stringify(responseBody)
  }
};




