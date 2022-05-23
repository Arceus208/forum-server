"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const Post_1 = require("./entities/Post");
const Comment_1 = require("./entities/Comment");
const express_1 = __importDefault(require("express"));
const apollo_server_express_1 = require("apollo-server-express");
const type_graphql_1 = require("type-graphql");
const post_1 = require("./resolvers/post");
const User_1 = require("./entities/User");
const user_1 = require("./resolvers/user");
const express_session_1 = __importDefault(require("express-session"));
const ioredis_1 = __importDefault(require("ioredis"));
const cors_1 = __importDefault(require("cors"));
const connect_redis_1 = __importDefault(require("connect-redis"));
const constants_1 = require("./constants");
const Vote_1 = require("./entities/Vote");
const comment_1 = require("./resolvers/comment");
const graphql_upload_1 = require("graphql-upload");
const Event_1 = require("./entities/Event");
const event_1 = require("./resolvers/event");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const main = async () => {
    const ele_name = process.env.ELEPHANTSQL_NAME;
    const ele_password = process.env.ELEPHANTSQL_PASSWORD;
    const ele_host = process.env.ELEPHANTSQL_HOST;
    const ele_port = process.env.ELEPHANTSQL_PORT;
    const conn = await (0, typeorm_1.createConnection)({
        type: "postgres",
        database: ele_name,
        username: ele_name,
        password: ele_password,
        host: ele_host,
        port: parseInt(ele_port),
        synchronize: true,
        entities: [Post_1.Post, User_1.User, Vote_1.Vote, Comment_1.Comment, Event_1.Event],
        extra: {
            connectionLimit: -1,
        },
    });
    const app = (0, express_1.default)();
    const RedisStore = (0, connect_redis_1.default)(express_session_1.default);
    const redis = new ioredis_1.default({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 100000,
    });
    app.use((0, cors_1.default)({
        origin: process.env.FRONT_END_URL,
        credentials: true,
    }));
    app.use((0, express_session_1.default)({
        name: constants_1.COOKIE_NAME,
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
        secret: process.env.COOKIE_SECRET,
        resave: false,
    }));
    app.use((0, graphql_upload_1.graphqlUploadExpress)({ maxFieldSize: 10000000, maxFiles: 10 }));
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: await (0, type_graphql_1.buildSchema)({
            resolvers: [post_1.PostResolver, user_1.UserResolver, comment_1.CommentResolver, event_1.EventResolver],
            validate: false,
        }),
        context: ({ req, res }) => ({ req, res, redis }),
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({
        app,
        cors: false,
    });
    app.listen(process.env.PORT || 4000, () => {
        console.log("server listen");
    });
};
main().catch((err) => {
    console.log(err);
});
//# sourceMappingURL=index.js.map