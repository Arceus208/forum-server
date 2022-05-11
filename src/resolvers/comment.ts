import { isAuth } from "../middlewares/isAuth";
import { MyContext } from "../types";
import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Comment } from "../entities/Comment";
import { User } from "../entities/User";

@Resolver(Comment)
export class CommentResolver {
  @FieldResolver(() => String)
  async username(@Root() root: Comment) {
    const user = await User.findOne({ id: root.userId });
    return user?.username;
  }

  @FieldResolver(() => String)
  async userImage(@Root() root: Comment) {
    const user = await User.findOne({ id: root.userId });
    return user?.image;
  }

  @Mutation(() => Comment)
  @UseMiddleware(isAuth)
  async postComment(
    @Arg("postId", () => Int) postId: number,
    @Arg("parentId", () => Int, { nullable: true }) parentId: number | null,
    @Arg("text", () => String) text: string,
    @Ctx() { req }: MyContext
  ): Promise<Comment> {
    const comment = await Comment.create({
      postId,
      userId: req.session.userId,
      text,
      parentId: parentId ? parentId : null,
    }).save();

    return comment;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteComment(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    const comment = await Comment.findOne({ id });
    if (req.session.userId === comment?.userId) {
      await Comment.delete({ id });
      return true;
    }
    return false;
  }

  @Query(() => [Comment])
  async getComments(
    @Arg("postId", () => Int) postId: number
  ): Promise<Comment[]> {
    const comments = await Comment.find({ postId });
    return comments;
  }
}
