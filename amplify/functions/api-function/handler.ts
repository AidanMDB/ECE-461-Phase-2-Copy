import type { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { calcMetrics } from './metrics_src/api-metric-caller';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import axios from "axios";
import StreamZip from "node-stream-zip";
import fs, { read } from "fs";
import path from "path";
import archiver from "archiver";
import * as tar from "tar";
import unzipper from "unzipper";
import esbuild from "esbuild";

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
async function checkKeyExists(tableName: string, key: { [key: string]: any }): Promise<boolean> {
  try {
    const params = {
      TableName: tableName,
      Key: key,
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
async function extractZip(extractPath: string, filePath: string) {
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
}

/**
 * @param entryPath - path to the file to debloat
 * @param outputFile - path to the output file 
 */
function debloatFile(entryPath: string, outputFile: string) {
  esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    minify: true,
    outfile: outputFile,
    treeShaking: true,
    platform: 'node',
    target: 'es2015'
  });
}




/**
 * @param packageJsonPath - path to the package.json file
 * @returns - object containing the package name, version, repository URL, and dependencies
 */
function extractPackageJSON(packageJsonPath: string) {
  const packageJSON = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let packageVersion = packageJSON.version? packageJSON.version : '1.0.0';
  let packageName = packageJSON.name
  let repositoryURL = packageJSON.repository.url ? packageJSON.repository.url : packageJSON.repository;
  let packageDep = {...packageJSON.dependencies, ...packageJSON.devDependencies}; 
  return {packageName, packageVersion, repositoryURL, packageDep};
}

/**
 * Converts the .tgz file from NPM to a .zip file
 * @param tgzPath - path to the tgz file
 * @param outputZipPath - path to the output zip file
 */
async function convertTgzToZip(tgzPath: string, outputZipPath: string) {
  await tar.x({ file: tgzPath, cwd: `${process.cwd()}`}).then(() => {});

  //console.log("codeFiles: ", codeFiles);
  
  
  // Create a zip file from the extracted folder
  const zipFilePath = path.join(`${process.cwd()}${TMP_PATH}`, `${outputZipPath}`);
  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  
  console.log(`Creating zip file at ${zipFilePath}`);
  archive.pipe(output);
  archive.directory(`${process.cwd()}/package`, false);
  await archive.finalize();

  fs.unlink(tgzPath, (err) => {
    if (err) {
        console.error(`Error in deleting tarball: ${err}`);
    }
    else {
        console.log(`Tarball deleted: ${tgzPath}`);
    }
  });
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
    console.log("package.json found in the zip file:", packageJsonEntry);
    if (!readMeEntry) {
      //console.log("README.md not found in the zip file");
      return {
        statusCode: 400,
        body: JSON.stringify("README.md not found in the zip file"),
      };
    }
    console.log("README.md found in the zip file:", readMeEntry);

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
    console.log("package.json data:", data);

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
    console.log("README.md data:", readMeData);

    const packageJSON = JSON.parse(data);
    const packageVersion = packageJSON.version? packageJSON.version : '1.0.0';
    const packageName = packageJSON.name
    const entryPoint = packageJSON.main ? packageJSON.main : null;
    const repositoryURL = packageJSON.repository.url ? packageJSON.repository.url : packageJSON.repository;
    const packageDep = {...packageJSON.dependencies, ...packageJSON.devDependencies}; 
    
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
    const contentBuffer = Buffer.from(Content, 'base64');
    const zipPath = `${TMP_PATH}/${Name}.zip`;
    fs.writeFileSync(zipPath, contentBuffer);
    console.log("Content written to zip file at path:", zipPath);

    // extract package info from zip file
    const result = await extractPackageInfo(zipPath);
    console.log("isContent result:", result);
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
      if (entryPoint) {
        extractZip(`${TMP_PATH}`, zipPath);
      }
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
      body: JSON.stringify({ error: "Error in isContent" }),
    }
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
    convertTgzToZip(filePath, `${Name}.zip`);

    // extract package info from zip file
    const result = await extractPackageInfo(`${process.cwd()}/${Name}.zip`);
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
    const readMeData = result.readMeData;

    // perform debloat if requested  TODO
    if (debloat) {
      if (entryPoint) {
        extractZip(`${TMP_PATH}`, `${process.cwd()}/${Name}.zip`);
      }
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
      body: JSON.stringify({ error: "Error in isNPM URL" }),
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
      if (entryPoint) {
        extractZip(`${TMP_PATH}`, filePath);
      }
    }

    return {packageName, packageVersion, repositoryURL, packageDep, entryPoint, readMeData};
  
  
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Error in isGithub URL" }),
    }
  }
}




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
  const packageID = `${packageName}${packageVersion}`;
  const existence = await checkKeyExists(packageTable, {ID: packageID});
  if (existence) {
    return {
      statusCode: 409,
      body: JSON.stringify('Package exists already.')
    }
  }

/*   try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `package/${packageName}${packageVersion}`,
    });

    const response = await s3.send(command);

    if (response.$metadata.httpStatusCode === 200) {
      return {
          statusCode: 409,
          body: JSON.stringify('Package exists already.'),
      }
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error checking if package exists in S3" })
    }
  } */


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
  const rateTable = "PackageRating";

  try {
    // create and send Package table for package
    const putCommand = new PutCommand({
      TableName: packageTable,
      Item: {
        ID: `${packageName}${packageVersion}`,
        Name: packageName,
        ReadME: readMeData,
        Version: packageVersion,
        Dependencies: packageDep,
        Rating: JSON.stringify(metrics)
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
    // create and send Rating table for package
    /* const putCommandRate = new PutCommand({
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

    await dynamoClient.send(putCommandRate); */
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

  return {
    statusCode: 201,
    body: JSON.stringify(responseBody)
  }
};




