import { Post } from "../entities/Post";
import { Vote } from "../entities/Vote";
import { Comment } from "../entities/Comment";
import {
  Resolver,
  Query,
  Arg,
  Int,
  Mutation,
  UseMiddleware,
  Ctx,
  ObjectType,
  Field,
  FieldResolver,
  Root,
} from "type-graphql";
import { isAuth } from "../middlewares/isAuth";
import { MyContext } from "../types";
import { FieldError } from "./user";
import { requireMinLength } from "../utils/validateInput";
import { getConnection } from "typeorm";

@ObjectType()
class PostResponse {
  @Field(() => Post, { nullable: true })
  post?: Post;
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field(() => Boolean)
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 400);
  }

  @FieldResolver(() => Int)
  async voteStatus(@Root() root: Post, @Ctx() { req }: MyContext) {
    const vote = await Vote.findOne({
      postId: root.id,
      userId: req.session.userId,
    });
    return vote?.value;
  }

  @FieldResolver(() => Int)
  async commentAmount(@Root() root: Post) {
    const numberOfComment = await Comment.count({ postId: root.id });
    return numberOfComment;
  }

  @Query(() => [Post])
  @UseMiddleware(isAuth)
  async myPosts(@Ctx() { req }: MyContext): Promise<Post[]> {
    const myPosts = await getConnection().query(`
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

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    const defaultLimit = Math.min(30, limit);
    const params: any[] = [defaultLimit + 1];

    if (cursor) {
      params.push(new Date(parseInt(cursor)));
    }

    const posts = await getConnection().query(
      `
      select p.*,
      json_build_object(
        'username',u.username,'id',u.id,'email',u.email,'image',u.image
      ) creator
      from post p
      inner join public.user u on u.id = p."creatorId"
      ${cursor ? `where p."createdAt" < $2` : ""}
      order by p."createdAt" DESC
      limit $1
    `,
      params
    );

    return {
      posts: posts.slice(0, defaultLimit),
      hasMore: posts.length === defaultLimit + 1,
    };
  }

  @Query(() => PaginatedPosts)
  async postsBySearch(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Arg("searchText", () => String) searchText: string
  ) {
    const defaultLimit = Math.min(30, limit);
    const params: any[] = [defaultLimit + 1];

    if (cursor) {
      params.push(new Date(parseInt(cursor)));
    }

    const posts = await getConnection().query(
      `
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
    `,
      params
    );

    return {
      posts: posts.slice(0, defaultLimit),
      hasMore: posts.length === defaultLimit + 1,
    };
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id, { relations: ["creator"] });
  }

  @Query(() => PaginatedPosts)
  async sortedByCommentAmount(@Arg("limit", () => Int) limit: number) {
    const defaultLimit = Math.min(30, limit);
    const params: any[] = [defaultLimit + 1];

    const posts = await getConnection().query(
      `
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
    `,
      params
    );

    console.log("post:", posts.slice(0, defaultLimit));

    return {
      posts: posts.slice(0, defaultLimit),
      hasMore: posts.length === defaultLimit + 1,
    };
  }

  @Mutation(() => PostResponse)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("title", () => String) title: string,
    @Arg("text", () => String) text: string,
    @Ctx() { req }: MyContext
  ): Promise<PostResponse> {
    if (!requireMinLength(title, 5)) {
      return {
        errors: [
          { field: "title", message: "Title length must be greater than 5" },
        ],
      };
    }

    if (!requireMinLength(text, 10)) {
      return {
        errors: [
          {
            field: "text",
            message: "must contain atleast 10 character",
          },
        ],
      };
    }

    const post = await Post.create({
      title,
      text,
      creatorId: req.session.userId,
    }).save();

    return { post: post };
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const isUpVote = value !== -1;
    const realValue = isUpVote ? 1 : -1;
    const { userId } = req.session;

    const vote = await Vote.findOne({ where: { userId, postId } });

    if (vote && vote.value !== realValue) {
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
          update vote
          set value = $1
          where "postId" =$2 and "userId"=$3
          `,
          [realValue, postId, userId]
        );

        await tm.query(
          `
          update post
          set points = points + $1
          where id = $2
        `,
          [2 * realValue, postId]
        );
      });
    } else if (vote && vote.value === realValue) {
      await getConnection().transaction(async (tm) => {
        tm.query(
          `
          delete from vote
          where "userId" = $1 and "postId" = $2
        `,
          [userId, postId]
        );

        tm.query(
          `
          update post
          set points = points - $1
          where id = $2
        `,
          [realValue, postId]
        );
      });
    } else if (!vote) {
      await getConnection().transaction(async (tm) => {
        tm.query(
          `
          insert into vote("userId","postId","value")
          values($1,$2,$3)
        `,
          [userId, postId, realValue]
        );

        tm.query(
          `
          update post
          set points = points + $1
          where id = $2
        `,
          [realValue, postId]
        );
      });
    }

    return true;
  }

  @Mutation(() => PostResponse, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title", () => String) title: string,
    @Arg("text", () => String) text: string,
    @Ctx() { req }: MyContext
  ): Promise<PostResponse> {
    const post = await Post.findOne({ id });

    if (!post) {
      return { post: undefined };
    }

    if (!requireMinLength(title, 5)) {
      return {
        errors: [
          { field: "title", message: "Title length must be greater than 5" },
        ],
      };
    }

    if (!requireMinLength(text, 10)) {
      return {
        errors: [
          {
            field: "text",
            message: "must contain atleast 10 character",
          },
        ],
      };
    }

    const updatedPost = await getConnection()
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id=:id and "creatorId"=:creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning("*")
      .execute();

    return { post: updatedPost.raw[0] };
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    await Post.delete({ id, creatorId: req.session.userId });
    return true;
  }
}
