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
    try {
            
    // 1. Clean S3
    console.log('Cleaning S3 Buckets...');
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
    console.log('Cleaning DynamoDB Tables...');
    const { TableNames } = await dynamoDB.send(new ListTablesCommand({}));
    
    if (TableNames) {
        for (const tableName of TableNames) {
            await dynamoDB.send(new DeleteTableCommand({ TableName: tableName }));
        }
    }

    // 3. Clean Cognito Users
    console.log('Cleaning Cognito Users...');
    const userPoolId = process.env.USER_POOL_ID!; // Ensure the user pool ID is available in env
            
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
    
    console.log('Reset complete.');
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
