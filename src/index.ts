import "reflect-metadata";
import { createConnection } from "typeorm";
import { Post } from "./entities/Post";
import { Comment } from "./entities/Comment";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { PostResolver } from "./resolvers/post";
import { User } from "./entities/User";
import { UserResolver } from "./resolvers/user";
import session from "express-session";
import Redis from "ioredis";
import cors from "cors";
import connectRedis from "connect-redis";
import { COOKIE_NAME, __prod__ } from "./constants";
import { MyContext } from "./types";
import { Vote } from "./entities/Vote";
import { CommentResolver } from "./resolvers/comment";
import { graphqlUploadExpress } from "graphql-upload";
import { Event } from "./entities/Event";
import { EventResolver } from "./resolvers/event";
import dotenv from "dotenv";

dotenv.config();

const main = async () => {
  const ele_name = process.env.ELEPHANTSQL_NAME;
  const ele_password = process.env.ELEPHANTSQL_PASSWORD;
  const ele_host = process.env.ELEPHANTSQL_HOST;
  const ele_port = process.env.ELEPHANTSQL_PORT!;

  const conn = await createConnection({
    type: "postgres",
    database: ele_name,
    username: ele_name,
    password: ele_password,
    /* url: `postgres://${ele_name}:${ele_password}@abul.db.elephantsql.com/ikcbxijm`, */
    host: ele_host,
    port: parseInt(ele_port),

    synchronize: true,
    /* migrations: [path.join(__dirname, "./migrations/*")], */
    entities: [Post, User, Vote, Comment, Event],
    extra: {
      connectionLimit: -1,
    },
  });

  /* await conn.runMigrations(); */

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!),
    password: process.env.REDIS_PASSWORD,
    connectTimeout: 100000,
  });

  app.use(
    cors({
      origin: process.env.FRONT_END_URL,
      credentials: true,
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365,
        httpOnly: true,
        sameSite: "none",
        secure: true,
      },
      saveUninitialized: false,
      secret: process.env.COOKIE_SECRET!,
      resave: false,
    })
  );

  app.use(graphqlUploadExpress({ maxFieldSize: 10000000, maxFiles: 10 }));

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResolver, CommentResolver, EventResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ req, res, redis }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    cors: false /* { origin: "https://studio.apollographql.com", credentials: true } */,
  });

  app.listen(process.env.PORT || 4000, () => {
    console.log("server listen");
  });
};

main().catch((err) => {
  console.log(err);
});
