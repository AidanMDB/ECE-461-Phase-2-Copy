/**
 * This file is for handling the api-reset REST API track.
**/

import { defineFunction } from '@aws-amplify/backend';
import { S3Client, ListBucketsCommand, DeleteObjectsCommand, 
    ListObjectsV2Command } from '@aws-sdk/client-s3';
import { DynamoDBClient, ListTablesCommand, 
    DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityProviderClient, ListUsersCommand, 
    AdminDeleteUserCommand, AdminDisableUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { APIGatewayProxyHandler } from "aws-lambda";

// Initialize AWS SDK clients
const s3 = new S3Client();
const dynamoDB = new DynamoDBClient();
const cognito = new CognitoIdentityProviderClient();

const bucketName = 'packageStorage';

export const handler: APIGatewayProxyHandler = async (event) => {
    // Check for 'X-authorization' header
    const authHeader = event.headers["X-authorization"];
    if (!authHeader) {
        return {
            statusCode: 403,
            body: JSON.stringify("Authentication failed due to invalid or missing AuthenticationToken.")
        };
    }

    // Check if the user has permission to reset the registry
    // Still need to implement this function
    const userHasPermission = checkUserPermission(authHeader);
    if (!userHasPermission) {
        return {
            statusCode: 401,
            body: JSON.stringify("You do not have permission to reset the registry.")
        };
    }

    try {
            
    // 1. Clean S3
    //console.log('Cleaning S3 Buckets...');
    const { Buckets } = await s3.send(new ListBucketsCommand({}));

    if (Buckets) {
        for (const bucket of Buckets) {
            const bucketName = bucket.Name;
            if (bucketName) {
                const { Contents } = await s3.send(new ListObjectsV2Command({ Bucket: bucketName }));
                if (Contents?.length) {
                    const deleteParams = {
                        Bucket: bucketName,
                        Delete: { Objects: Contents.map(obj => ({ Key: obj.Key! })) },
                    };
                    await s3.send(new DeleteObjectsCommand(deleteParams));
                }
            }
        }
    }

    // 2. Clean DynamoDB
    //console.log('Cleaning DynamoDB Tables...');
    const { TableNames } = await dynamoDB.send(new ListTablesCommand({}));
    
    if (TableNames) {
        for (const tableName of TableNames) {
            await dynamoDB.send(new DeleteTableCommand({ TableName: tableName }));
        }
    }

    // 3. Clean Cognito Users
    //console.log('Cleaning Cognito Users...');
    const userPoolId = process.env.USER_POOL_ID;
            
    const { Users } = await cognito.send(new ListUsersCommand({ UserPoolId: userPoolId }));
    
    if (Users) {
        for (const user of Users) {
            const username = user.Username!;
            const isAdmin = user.Attributes?.some(attr => attr.Name === 'custom:isAdmin' && attr.Value === 'true');
            
            if (!isAdmin) {
                await cognito.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: username }));
            } else {
                await cognito.send(new AdminDisableUserCommand({ UserPoolId: userPoolId, Username: username }));
            }
        }
    }
    
    //console.log('Reset complete.');
    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Reset complete.' }),
    };
} catch (error) {
    console.error('Error during reset:', error);
    return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error during reset.', error: (error as any).message }),
    };
    }
};

const checkUserPermission = (authHeader: string): boolean => {
    // Implement your logic to check if the user has permission to reset the registry
    // For example, you can decode the JWT token and check the user's role or permissions
    return true; // Replace with actual permission check
};