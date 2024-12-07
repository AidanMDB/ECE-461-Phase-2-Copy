import { type ClientSchema, a, defineData, defineFunction } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
const functionWithDataAccess = defineFunction({
  name: 'api-function',
  entry: '../functions/api-function/handler.ts',
})

const schema = a.schema({
  Package: a.model({
    ID: a.string().required(),           // will just be {Name}{Version} concatenated
    Name: a.string().required(),
    ReadME: a.string().required(),
    Version: a.string().required(),
    Dependencies: a.string().required(),
    Rating: a.string().required(),
  }).authorization((allow) => [allow.publicApiKey()]),

  // .authorization((allow) => [allow.owner()])

/*   PackageRating: a.model({
    package: a.belongsTo("Package", "ID"),
    ID: a.string().required(),
    BusFactor: a.float().required(),
    BusFactorLatency: a.float().required(),
    Correctness: a.float().required(),
    CorrectnessLatency: a.float().required(),
    RampUp: a.float().required(),
    RampUpLatency: a.float().required(),
    ResponsiveMaintainer: a.float().required(),
    ResponsiveMaintainerLatency: a.float().required(),
    LicenseScore: a.float().required(),
    LicenseScoreLatency: a.float().required(),
    GoodPinningPractice: a.float().required(),
    GoodPinningPracticeLatency: a.float().required(),
    PullRequest: a.float().required(),
    PullRequestLatency: a.float().required(),
    NetScore: a.float().required(),
    NetScoreLatency: a.float().required()
  }).authorization((allow) => [allow.publicApiKey()]),
 */
});


export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>