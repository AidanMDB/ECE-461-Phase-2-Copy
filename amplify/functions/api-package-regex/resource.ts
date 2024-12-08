import { defineFunction } from '@aws-amplify/backend';

export const myApiFunctionRegex = defineFunction({ 
    name: 'api-package-regex',
    timeoutSeconds: 60,
    runtime: 20
});