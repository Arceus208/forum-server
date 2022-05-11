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
exports.PostResolver = void 0;
const Post_1 = require("../entities/Post");
const Vote_1 = require("../entities/Vote");
const Comment_1 = require("../entities/Comment");
const type_graphql_1 = require("type-graphql");
const isAuth_1 = require("../middlewares/isAuth");
const user_1 = require("./user");
const validateInput_1 = require("../utils/validateInput");
const typeorm_1 = require("typeorm");
let PostResponse = class PostResponse {
};
__decorate([
    (0, type_graphql_1.Field)(() => Post_1.Post, { nullable: true }),
    __metadata("design:type", Post_1.Post)
], PostResponse.prototype, "post", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => [user_1.FieldError], { nullable: true }),
    __metadata("design:type", Array)
], PostResponse.prototype, "errors", void 0);
PostResponse = __decorate([
    (0, type_graphql_1.ObjectType)()
], PostResponse);
let PaginatedPosts = class PaginatedPosts {
};
__decorate([
    (0, type_graphql_1.Field)(() => [Post_1.Post]),
    __metadata("design:type", Array)
], PaginatedPosts.prototype, "posts", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => Boolean),
    __metadata("design:type", Boolean)
], PaginatedPosts.prototype, "hasMore", void 0);
PaginatedPosts = __decorate([
    (0, type_graphql_1.ObjectType)()
], PaginatedPosts);
let PostResolver = class PostResolver {
    textSnippet(root) {
        return root.text.slice(0, 400);
    }
    async voteStatus(root, { req }) {
        const vote = await Vote_1.Vote.findOne({
            postId: root.id,
            userId: req.session.userId,
        });
        return vote === null || vote === void 0 ? void 0 : vote.value;
    }
    async commentAmount(root) {
        const numberOfComment = await Comment_1.Comment.count({ postId: root.id });
        return numberOfComment;
    }
    async myPosts({ req }) {
        const myPosts = await (0, typeorm_1.getConnection)().query(`
    select p.*,
    json_build_object(
      'username',u.username,'id',u.id,'email',u.email,'image',u.image
    ) creator
    from post p
    inner join public.user u on u.id = p."creatorId"
    where p."creatorId"= ${req.session.userId}
    order by p."createdAt" DESC
  `);
        return myPosts;
    }
    async posts(limit, cursor) {
        const defaultLimit = Math.min(30, limit);
        const params = [defaultLimit + 1];
        if (cursor) {
            params.push(new Date(parseInt(cursor)));
        }
        const posts = await (0, typeorm_1.getConnection)().query(`
      select p.*,
      json_build_object(
        'username',u.username,'id',u.id,'email',u.email,'image',u.image
      ) creator
      from post p
      inner join public.user u on u.id = p."creatorId"
      ${cursor ? `where p."createdAt" < $2` : ""}
      order by p."createdAt" DESC
      limit $1
    `, params);
        return {
            posts: posts.slice(0, defaultLimit),
            hasMore: posts.length === defaultLimit + 1,
        };
    }
    async postsBySearch(limit, cursor, searchText) {
        const defaultLimit = Math.min(30, limit);
        const params = [defaultLimit + 1];
        if (cursor) {
            params.push(new Date(parseInt(cursor)));
        }
        const posts = await (0, typeorm_1.getConnection)().query(`
      select p.*,
      json_build_object(
        'username',u.username,'id',u.id,'email',u.email,'image',u.image
      ) creator
      from post p
      inner join public.user u on u.id = p."creatorId"
      where p.title ILIKE '%${searchText}%' or p.text ILIKE '%${searchText}%'       
      ${cursor ? `and p."createdAt" < $2` : ""} 
      order by p."createdAt" DESC
      limit $1
    `, params);
        return {
            posts: posts.slice(0, defaultLimit),
            hasMore: posts.length === defaultLimit + 1,
        };
    }
    post(id) {
        return Post_1.Post.findOne(id, { relations: ["creator"] });
    }
    async sortedByCommentAmount(limit) {
        const defaultLimit = Math.min(30, limit);
        const params = [defaultLimit + 1];
        const posts = await (0, typeorm_1.getConnection)().query(`
      select pc.title,pc.id,
      json_build_object(
        'username',u.username,'image',u.image
      ) creator
      
      from (
        select p.* from post p
        inner join comment c on c."postId" = p.id     
        group by p.id
        order by count(c.id) 
      ) as pc
      inner join public.user u on u.id = pc."creatorId"
      
      limit $1
    `, params);
        console.log("post:", posts.slice(0, defaultLimit));
        return {
            posts: posts.slice(0, defaultLimit),
            hasMore: posts.length === defaultLimit + 1,
        };
    }
    async createPost(title, text, { req }) {
        if (!(0, validateInput_1.requireMinLength)(title, 5)) {
            return {
                errors: [
                    { field: "title", message: "Title length must be greater than 5" },
                ],
            };
        }
        if (!(0, validateInput_1.requireMinLength)(text, 10)) {
            return {
                errors: [
                    {
                        field: "text",
                        message: "must contain atleast 10 character",
                    },
                ],
            };
        }
        const post = await Post_1.Post.create({
            title,
            text,
            creatorId: req.session.userId,
        }).save();
        return { post: post };
    }
    async vote(postId, value, { req }) {
        const isUpVote = value !== -1;
        const realValue = isUpVote ? 1 : -1;
        const { userId } = req.session;
        const vote = await Vote_1.Vote.findOne({ where: { userId, postId } });
        if (vote && vote.value !== realValue) {
            await (0, typeorm_1.getConnection)().transaction(async (tm) => {
                await tm.query(`
          update vote
          set value = $1
          where "postId" =$2 and "userId"=$3
          `, [realValue, postId, userId]);
                await tm.query(`
          update post
          set points = points + $1
          where id = $2
        `, [2 * realValue, postId]);
            });
        }
        else if (vote && vote.value === realValue) {
            await (0, typeorm_1.getConnection)().transaction(async (tm) => {
                tm.query(`
          delete from vote
          where "userId" = $1 and "postId" = $2
        `, [userId, postId]);
                tm.query(`
          update post
          set points = points - $1
          where id = $2
        `, [realValue, postId]);
            });
        }
        else if (!vote) {
            await (0, typeorm_1.getConnection)().transaction(async (tm) => {
                tm.query(`
          insert into vote("userId","postId","value")
          values($1,$2,$3)
        `, [userId, postId, realValue]);
                tm.query(`
          update post
          set points = points + $1
          where id = $2
        `, [realValue, postId]);
            });
        }
        return true;
    }
    async updatePost(id, title, text, { req }) {
        const post = await Post_1.Post.findOne({ id });
        if (!post) {
            return { post: undefined };
        }
        if (!(0, validateInput_1.requireMinLength)(title, 5)) {
            return {
                errors: [
                    { field: "title", message: "Title length must be greater than 5" },
                ],
            };
        }
        if (!(0, validateInput_1.requireMinLength)(text, 10)) {
            return {
                errors: [
                    {
                        field: "text",
                        message: "must contain atleast 10 character",
                    },
                ],
            };
        }
        const updatedPost = await (0, typeorm_1.getConnection)()
            .createQueryBuilder()
            .update(Post_1.Post)
            .set({ title, text })
            .where('id=:id and "creatorId"=:creatorId', {
            id,
            creatorId: req.session.userId,
        })
            .returning("*")
            .execute();
        return { post: updatedPost.raw[0] };
    }
    async deletePost(id, { req }) {
        await Post_1.Post.delete({ id, creatorId: req.session.userId });
        return true;
    }
};
__decorate([
    (0, type_graphql_1.FieldResolver)(() => String),
    __param(0, (0, type_graphql_1.Root)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Post_1.Post]),
    __metadata("design:returntype", void 0)
], PostResolver.prototype, "textSnippet", null);
__decorate([
    (0, type_graphql_1.FieldResolver)(() => type_graphql_1.Int),
    __param(0, (0, type_graphql_1.Root)()),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Post_1.Post, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "voteStatus", null);
__decorate([
    (0, type_graphql_1.FieldResolver)(() => type_graphql_1.Int),
    __param(0, (0, type_graphql_1.Root)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Post_1.Post]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "commentAmount", null);
__decorate([
    (0, type_graphql_1.Query)(() => [Post_1.Post]),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "myPosts", null);
__decorate([
    (0, type_graphql_1.Query)(() => PaginatedPosts),
    __param(0, (0, type_graphql_1.Arg)("limit", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("cursor", () => String, { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "posts", null);
__decorate([
    (0, type_graphql_1.Query)(() => PaginatedPosts),
    __param(0, (0, type_graphql_1.Arg)("limit", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("cursor", () => String, { nullable: true })),
    __param(2, (0, type_graphql_1.Arg)("searchText", () => String)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, String]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "postsBySearch", null);
__decorate([
    (0, type_graphql_1.Query)(() => Post_1.Post, { nullable: true }),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "post", null);
__decorate([
    (0, type_graphql_1.Query)(() => PaginatedPosts),
    __param(0, (0, type_graphql_1.Arg)("limit", () => type_graphql_1.Int)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "sortedByCommentAmount", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => PostResponse),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("title", () => String)),
    __param(1, (0, type_graphql_1.Arg)("text", () => String)),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "createPost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("postId", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("value", () => type_graphql_1.Int)),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "vote", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => PostResponse, { nullable: true }),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("title", () => String)),
    __param(2, (0, type_graphql_1.Arg)("text", () => String)),
    __param(3, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "updatePost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "deletePost", null);
PostResolver = __decorate([
    (0, type_graphql_1.Resolver)(Post_1.Post)
], PostResolver);
exports.PostResolver = PostResolver;
//# sourceMappingURL=post.js.map