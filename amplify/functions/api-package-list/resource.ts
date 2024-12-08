import { defineFunction } from '@aws-amplify/backend';

export const myApiPackages = defineFunction({ 
    name: 'api-package-list',
    timeoutSeconds: 300,
});