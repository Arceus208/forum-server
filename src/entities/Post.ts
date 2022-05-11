import { ObjectType, Field, Int } from "type-graphql";
import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from "typeorm";
import { User } from "./User";
import { Vote } from "./Vote";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column({ type: "varchar" })
  @Index({ fulltext: true })
  title!: string;

  @Field()
  @Column({ type: "int", default: 0 })
  points: number;

  @Field()
  @Column()
  @Index({ fulltext: true })
  text!: string;

  @Field()
  @Column()
  creatorId!: number;

  @Field()
  @ManyToOne(() => User, (user) => user.posts)
  creator!: User;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Vote, (vote) => vote.post)
  votes: Vote[];

  @Field(() => Int, { nullable: true })
  voteStatus!: number | null;

  @Field(() => Int)
  commentAmount: number;
}
