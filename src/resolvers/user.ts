import { User } from "../entities/User";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { FileUpload, GraphQLUpload } from "graphql-upload";
import { MyContext } from "../types";
import { COOKIE_NAME, DEFAULT_PIC, FORGOT_PASSWORD } from "../constants";
import { requireMinLength, validateEmail } from "../utils/validateInput";
import { NAMEMINLENGTH, PASSWORDMINLENGTH } from "../utils/validateRules";
import { sendEmail } from "../utils/sendEmail";
import { cloudinaryUpload } from "../utils/cloudinaryUpload";

@ObjectType()
export class File {
  @Field()
  filename: string;
  @Field()
  mimetype: string;
  @Field()
  encoding: string;
}

@ObjectType()
export class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.session.userId === user.id) {
      return user.email;
    }

    return "";
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    if (!req.session.userId) {
      return null;
    }

    console.log(req.session);

    return User.findOne(req.session.userId);
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("username", () => String) username: string,
    @Arg("email", () => String) email: string,
    @Arg("password", () => String) password: string,
    @Arg("file", () => GraphQLUpload, { nullable: true })
    file: FileUpload,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    if (!requireMinLength(username, NAMEMINLENGTH)) {
      return {
        errors: [
          {
            field: "username",
            message: `Username length must be greater or equal ${NAMEMINLENGTH}`,
          },
        ],
      };
    }

    if (!validateEmail(email)) {
      return {
        errors: [{ field: "email", message: "invalid email" }],
      };
    }

    if (!requireMinLength(password, PASSWORDMINLENGTH)) {
      return {
        errors: [
          {
            field: "password",
            message: `Password length must be greater than ${PASSWORDMINLENGTH}`,
          },
        ],
      };
    }

    const checkedUserExist = await User.findOne({ email });

    if (checkedUserExist) {
      return {
        errors: [{ field: "email", message: "This email is already used" }],
      };
    }
    let image = DEFAULT_PIC;
    if (file) {
      image = await cloudinaryUpload(file.createReadStream());
    }
    const hashedPassword = await argon2.hash(password);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      image,
    }).save();

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("username", () => String) username: string,
    @Arg("password", () => String) password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne({ username });
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

    const valid = await argon2.verify(user.password, password);
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

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email", () => String) email: string,
    @Ctx() { redis }: MyContext
  ) {
    let user = await User.findOne({ email });
    if (!user) {
      return true;
    }

    const token = uuidv4();
    await redis.set(
      FORGOT_PASSWORD + token,
      user.id,
      "ex",
      1000 * 60 * 60 * 24
    );

    const link = `<a href="http://my-forum2.vercel.app/change-password/${token}">reset password</a>`;

    await sendEmail(user.email, link);
    return true;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("password", () => String) password: string,
    @Arg("token", () => String) token: string,
    @Ctx() { redis }: MyContext
  ): Promise<UserResponse> {
    if (!requireMinLength(password, PASSWORDMINLENGTH)) {
      return {
        errors: [
          {
            field: "password",
            message: `password length must be greater or equal ${PASSWORDMINLENGTH}`,
          },
        ],
      };
    }

    const redisKey = FORGOT_PASSWORD + token;
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

    let user = await User.findOne(parseInt(userId));

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

    const newPassword = await argon2.hash(password);

    await User.update({ id: parseInt(userId) }, { password: newPassword });

    await redis.del(redisKey);

    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) => {
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          resolve(false);
          return;
        }
        resolve(true);
        return;
      });
    });
  }
}
