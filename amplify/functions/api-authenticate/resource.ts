/**
 * This file is for calling the handler for the api-authenticate REST API track.
**/

import { defineFunction } from '@aws-amplify/backend';
import { User } from 'aws-cdk-lib/aws-iam';

export const myApiFunctionAuthenticate = defineFunction({ 
    name: 'api-authenticate',
    timeoutSeconds: 60,
    runtime: 20,
    environment: {
        USER_POOL_ID: 'us-east-1_cwR5jLfKp',
        USER_POOL_CLIENT_ID: 't5tjiuuh18h4g6au49qo4lnds',
        IDENTITY_POOL_ID: 'us-east-1:788769ff-e3df-41d8-910e-7316d3cf6bfc',
        AUTH_ROLE_ARN: 'arn:aws:iam::448049787507:role/service-role/Phase2WebbApp-IdentityPool-IAM',
        UNAUTH_ROLE_ARN: 'arn:aws:iam::448049787507:role/service-role/Phase2WebbApp-IdentityPool-IAM-Guest',
        
    }
});