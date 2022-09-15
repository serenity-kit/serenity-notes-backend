require("make-promises-safe"); // installs an 'unhandledRejection' handler
import { ApolloServer } from "apollo-server-express";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { CustomContext } from "./types";
import { schema } from "./schema";
import paddleWebhooksRouter from "./routes/paddle-webhooks";
import Olm from "olm";
// only need to be done once in the whole app
Olm.init();

let olmUtility: Olm.Utility | undefined = undefined;

const apollo = new ApolloServer({
  schema,
  context: ({ req, res }) => {
    const context: CustomContext = {
      setCookie: (name, value, options) => {
        res.cookie(name, value, options);
      },
      clearCookie: (name, options) => {
        res.clearCookie(name, options);
      },
    };
    if (req.headers.authorization) {
      const authValues = req.headers.authorization.split(" ");
      if (authValues[0].toLowerCase() === "signed-utc-msg") {
        // unary makes it safer
        // see https://github.com/microsoft/TypeScript/issues/5710#issuecomment-157886246
        const sentDate = +new Date(authValues[2]);
        const currentDateTime = +new Date();
        const timeDifference = currentDateTime - sentDate;
        const tenMinInMs = 600000;
        if (timeDifference > -tenMinInMs && timeDifference < tenMinInMs) {
          try {
            if (!olmUtility) {
              olmUtility = new Olm.Utility();
            }
            olmUtility.ed25519_verify(authValues[1], authValues[2], authValues[3]);
            context.signedUtcMessage = {
              signingKey: authValues[1],
              utcMessage: authValues[2],
              signature: authValues[3],
            };
          } catch (err) {
            throw new Error("Authentication failed");
          }
        } else {
          throw new Error("Authentication failed");
        }
      } else {
        throw new Error("Authentication failed");
      }
    }
    if (req.cookies?.billing_auth) {
      context.billingAccountAuthToken = req.cookies.billing_auth;
    }
    return context;
  },
});

const allowedOrigin =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
    ? "http://localhost:3000"
    : "https://www.serenity.re";
const corsOptions = { credentials: true, origin: allowedOrigin };

const app = express();
app.use(express.urlencoded()); // needed for the Paddle Webhooks
app.use(cookieParser());
app.use(cors(corsOptions));
app.use("/webhooks", paddleWebhooksRouter);
apollo.applyMiddleware({ app, cors: corsOptions });

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`🚀 App ready at http://localhost:${port}/`);
  console.log(`🚀 GraphQL service ready at http://localhost:${port}/graphql`);
});
