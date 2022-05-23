"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResolver = exports.FieldError = exports.File = void 0;
const User_1 = require("../entities/User");
const type_graphql_1 = require("type-graphql");
const argon2_1 = __importDefault(require("argon2"));
const uuid_1 = require("uuid");
const graphql_upload_1 = require("graphql-upload");
const constants_1 = require("../constants");
const validateInput_1 = require("../utils/validateInput");
const validateRules_1 = require("../utils/validateRules");
const sendEmail_1 = require("../utils/sendEmail");
const cloudinaryUpload_1 = require("../utils/cloudinaryUpload");
let File = class File {
};
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], File.prototype, "filename", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], File.prototype, "mimetype", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], File.prototype, "encoding", void 0);
File = __decorate([
    (0, type_graphql_1.ObjectType)()
], File);
exports.File = File;
let FieldError = class FieldError {
};
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], FieldError.prototype, "field", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], FieldError.prototype, "message", void 0);
FieldError = __decorate([
    (0, type_graphql_1.ObjectType)()
], FieldError);
exports.FieldError = FieldError;
let UserResponse = class UserResponse {
};
__decorate([
    (0, type_graphql_1.Field)(() => [FieldError], { nullable: true }),
    __metadata("design:type", Array)
], UserResponse.prototype, "errors", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], UserResponse.prototype, "user", void 0);
UserResponse = __decorate([
    (0, type_graphql_1.ObjectType)()
], UserResponse);
let UserResolver = class UserResolver {
    email(user, { req }) {
        if (req.session.userId === user.id) {
            return user.email;
        }
        return "";
    }
    me({ req }) {
        if (!req.session.userId) {
            return null;
        }
        console.log(req.session);
        return User_1.User.findOne(req.session.userId);
    }
    async register(username, email, password, file, { req }) {
        if (!(0, validateInput_1.requireMinLength)(username, validateRules_1.NAMEMINLENGTH)) {
            return {
                errors: [
                    {
                        field: "username",
                        message: `Username length must be greater or equal ${validateRules_1.NAMEMINLENGTH}`,
                    },
                ],
            };
        }
        if (!(0, validateInput_1.validateEmail)(email)) {
            return {
                errors: [{ field: "email", message: "invalid email" }],
            };
        }
        if (!(0, validateInput_1.requireMinLength)(password, validateRules_1.PASSWORDMINLENGTH)) {
            return {
                errors: [
                    {
                        field: "password",
                        message: `Password length must be greater than ${validateRules_1.PASSWORDMINLENGTH}`,
                    },
                ],
            };
        }
        const checkedUserExist = await User_1.User.findOne({ email });
        if (checkedUserExist) {
            return {
                errors: [{ field: "email", message: "This email is already used" }],
            };
        }
        let image = constants_1.DEFAULT_PIC;
        if (file) {
            image = await (0, cloudinaryUpload_1.cloudinaryUpload)(file.createReadStream());
        }
        const hashedPassword = await argon2_1.default.hash(password);
        const user = await User_1.User.create({
            username,
            email,
            password: hashedPassword,
            image,
        }).save();
        req.session.userId = user.id;
        return { user };
    }
    async login(username, password, { req }) {
        const user = await User_1.User.findOne({ username });
        if (!user) {
            return {
                errors: [
                    {
                        field: "username",
                        message: "username or password incorrect",
                    },
                ],
            };
        }
        const valid = await argon2_1.default.verify(user.password, password);
        if (!valid) {
            return {
                errors: [
                    {
                        field: "password",
                        message: "username or password incorrect",
                    },
                ],
            };
        }
        req.session.userId = user.id;
        return { user };
    }
    async forgotPassword(email, { redis }) {
        let user = await User_1.User.findOne({ email });
        if (!user) {
            return true;
        }
        const token = (0, uuid_1.v4)();
        await redis.set(constants_1.FORGOT_PASSWORD + token, user.id, "ex", 1000 * 60 * 60 * 24);
        const link = `<a href="http://my-forum2.vercel.app/change-password/${token}">reset password</a>`;
        await (0, sendEmail_1.sendEmail)(user.email, link);
        return true;
    }
    async changePassword(password, token, { redis }) {
        if (!(0, validateInput_1.requireMinLength)(password, validateRules_1.PASSWORDMINLENGTH)) {
            return {
                errors: [
                    {
                        field: "password",
                        message: `password length must be greater or equal ${validateRules_1.PASSWORDMINLENGTH}`,
                    },
                ],
            };
        }
        const redisKey = constants_1.FORGOT_PASSWORD + token;
        let userId = await redis.get(redisKey);
        if (!userId) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "token is expired or not valid",
                    },
                ],
            };
        }
        let user = await User_1.User.findOne(parseInt(userId));
        if (!user) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "user no longer exist",
                    },
                ],
            };
        }
        const newPassword = await argon2_1.default.hash(password);
        await User_1.User.update({ id: parseInt(userId) }, { password: newPassword });
        await redis.del(redisKey);
        return {
            user,
        };
    }
    logout({ req, res }) {
        return new Promise((resolve) => {
            req.session.destroy((err) => {
                res.clearCookie(constants_1.COOKIE_NAME);
                if (err) {
                    resolve(false);
                    return;
                }
                resolve(true);
                return;
            });
        });
    }
};
__decorate([
    (0, type_graphql_1.FieldResolver)(() => String),
    __param(0, (0, type_graphql_1.Root)()),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User_1.User, Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "email", null);
__decorate([
    (0, type_graphql_1.Query)(() => User_1.User, { nullable: true }),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "me", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => UserResponse),
    __param(0, (0, type_graphql_1.Arg)("username", () => String)),
    __param(1, (0, type_graphql_1.Arg)("email", () => String)),
    __param(2, (0, type_graphql_1.Arg)("password", () => String)),
    __param(3, (0, type_graphql_1.Arg)("file", () => graphql_upload_1.GraphQLUpload, { nullable: true })),
    __param(4, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "register", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => UserResponse),
    __param(0, (0, type_graphql_1.Arg)("username", () => String)),
    __param(1, (0, type_graphql_1.Arg)("password", () => String)),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "login", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)("email", () => String)),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "forgotPassword", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => UserResponse),
    __param(0, (0, type_graphql_1.Arg)("password", () => String)),
    __param(1, (0, type_graphql_1.Arg)("token", () => String)),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "changePassword", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserResolver.prototype, "logout", null);
UserResolver = __decorate([
    (0, type_graphql_1.Resolver)(User_1.User)
], UserResolver);
exports.UserResolver = UserResolver;
//# sourceMappingURL=user.js.map