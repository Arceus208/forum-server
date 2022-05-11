import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

@ObjectType()
@Entity()
export class Comment extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  userId: number;

  @Field()
  @Column()
  postId: number;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  parentId: number | null;

  @Field()
  @Column()
  text: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Post, { onDelete: "CASCADE" })
  post: Post;

  @ManyToOne(() => Comment, {
    onDelete: "CASCADE",
  })
  parent: Comment;
}
