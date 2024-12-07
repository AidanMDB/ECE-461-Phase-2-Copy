import { defineAuth } from "@aws-amplify/backend";
import { referenceAuth } from "@aws-amplify/backend";

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */

const region = process.env.AWS_REGION!;
const accountId = process.env.AWS_ACCOUNT_ID!;
const apiId = process.env.API_ID!;
const bucketName = process.env.BUCKET_NAME!;

export const auth = referenceAuth({
  userPoolId: 'us-east-1_cwR5jLfKp',
  identityPoolId: 'us-east-1:788769ff-e3df-41d8-910e-7316d3cf6bfc',
  authRoleArn: 'arn:aws:iam::448049787507:role/service-role/Phase2WebbApp-IdentityPool-IAM',
  unauthRoleArn: 'arn:aws:iam::448049787507:role/service-role/Phase2WebbApp-IdentityPool-IAM-Guest',
  userPoolClientId: 't5tjiuuh18h4g6au49qo4lnds',
});

// export const auth = defineAuth({

//   loginWith: {
//     email: true,
//   },
    
//   groups: ["ADMINS", "UPLOAD", "SEARCH", "DOWNLOAD"],


// });

