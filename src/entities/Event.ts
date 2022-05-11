import { Field, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@ObjectType()
@Entity()
export class Event extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column()
  location: string;

  @Field()
  @Column()
  description: string;

  @Field()
  @Column({ type: "float" })
  latitude: number;

  @Field()
  @Column({ type: "float" })
  longitude: number;

  @Field()
  @Column()
  eventDate: string;

  @Field()
  @Column()
  eventTime: string;

  @Field()
  @Column()
  creatorId!: number;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.events)
  creator!: User;

  @Field()
  @Column()
  image!: string;
}
