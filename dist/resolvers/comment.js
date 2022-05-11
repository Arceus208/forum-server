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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentResolver = void 0;
const isAuth_1 = require("../middlewares/isAuth");
const type_graphql_1 = require("type-graphql");
const Comment_1 = require("../entities/Comment");
const User_1 = require("../entities/User");
let CommentResolver = class CommentResolver {
    async username(root) {
        const user = await User_1.User.findOne({ id: root.userId });
        return user === null || user === void 0 ? void 0 : user.username;
    }
    async userImage(root) {
        const user = await User_1.User.findOne({ id: root.userId });
        return user === null || user === void 0 ? void 0 : user.image;
    }
    async postComment(postId, parentId, text, { req }) {
        const comment = await Comment_1.Comment.create({
            postId,
            userId: req.session.userId,
            text,
            parentId: parentId ? parentId : null,
        }).save();
        return comment;
    }
    async deleteComment(id, { req }) {
        const comment = await Comment_1.Comment.findOne({ id });
        if (req.session.userId === (comment === null || comment === void 0 ? void 0 : comment.userId)) {
            await Comment_1.Comment.delete({ id });
            return true;
        }
        return false;
    }
    async getComments(postId) {
        const comments = await Comment_1.Comment.find({ postId });
        return comments;
    }
};
__decorate([
    (0, type_graphql_1.FieldResolver)(() => String),
    __param(0, (0, type_graphql_1.Root)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Comment_1.Comment]),
    __metadata("design:returntype", Promise)
], CommentResolver.prototype, "username", null);
__decorate([
    (0, type_graphql_1.FieldResolver)(() => String),
    __param(0, (0, type_graphql_1.Root)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Comment_1.Comment]),
    __metadata("design:returntype", Promise)
], CommentResolver.prototype, "userImage", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Comment_1.Comment),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("postId", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("parentId", () => type_graphql_1.Int, { nullable: true })),
    __param(2, (0, type_graphql_1.Arg)("text", () => String)),
    __param(3, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, String, Object]),
    __metadata("design:returntype", Promise)
], CommentResolver.prototype, "postComment", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], CommentResolver.prototype, "deleteComment", null);
__decorate([
    (0, type_graphql_1.Query)(() => [Comment_1.Comment]),
    __param(0, (0, type_graphql_1.Arg)("postId", () => type_graphql_1.Int)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CommentResolver.prototype, "getComments", null);
CommentResolver = __decorate([
    (0, type_graphql_1.Resolver)(Comment_1.Comment)
], CommentResolver);
exports.CommentResolver = CommentResolver;
//# sourceMappingURL=comment.js.map