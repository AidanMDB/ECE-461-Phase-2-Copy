import { defineFunction } from '@aws-amplify/backend';

export const apiReset = defineFunction({ 
    name: 'api-reset',
    timeoutSeconds: 60,
    runtime: 20
});

// clean s3 and dynamoDB and every user from cognito and leave the one admin user
