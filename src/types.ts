import { Request, Response } from "express";
import { Session } from "express-session";
import { Redis } from "ioredis";

declare module "express-session" {
  export interface Session {
    userId: number;
  }
}

export type MyContext = {
  req: Request & { session: Session };
  res: Response;
  redis: Redis;
};
