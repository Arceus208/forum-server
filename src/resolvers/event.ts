import { Event } from "../entities/Event";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { FileUpload, GraphQLUpload } from "graphql-upload";
import { isAuth } from "../middlewares/isAuth";
import { getCoordsByAddress } from "../utils/getLocation";
import { FieldError } from "./user";
import { MyContext } from "src/types";
import { User } from "../entities/User";
import { DEFAULT_PIC } from "../constants";
import { cloudinaryUpload } from "../utils/cloudinaryUpload";
import { getConnection } from "typeorm";

@ObjectType()
class EventResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Event, { nullable: true })
  event?: Event;
}

@ObjectType()
class Coordiantes {
  @Field()
  lat: number;
  @Field()
  long: number;
}

@ObjectType()
class EventsByCityResponse {
  @Field(() => Coordiantes, { nullable: true })
  coordinates?: Coordiantes;
  @Field(() => [Event])
  events: Event[];
  @Field(() => String, { nullable: true })
  error?: string;
}

@Resolver(Event)
export class EventResolver {
  @FieldResolver(() => String)
  async hostName(@Root() root: Event) {
    const user = await User.findOne({ id: root.creatorId });
    return user?.username;
  }

  @Query(() => [Event])
  async getEvents(): Promise<Event[]> {
    const events = await Event.find({});
    return events;
  }

  @Query(() => Event || { nullable: true })
  async event(@Arg("id", () => Int) id: number): Promise<Event | undefined> {
    const event = await Event.findOne({ id });
    return event;
  }

  @Query(() => [Event])
  async myevents(@Ctx() { req }: MyContext): Promise<Event[]> {
    const { userId } = req.session;
    const events = await getConnection().query(`
      select *
      from event e
      inner join user_myevents_event as ume on ume."eventId" =  e.id
      where ume."userId" = ${userId} 
    `);

    return events;
  }

  @Query(() => EventsByCityResponse)
  async getEventsByCity(
    @Arg("city", () => String) city: string
  ): Promise<EventsByCityResponse> {
    if (city.trim().length !== 0) {
      const coordsData = await getCoordsByAddress(city);

      if (!coordsData || coordsData.features.length === 0) {
        return {
          events: [],
          error: "No matches city",
        };
      }

      const latitude = coordsData.features[0].geometry.coordinates[1];
      const longitude = coordsData.features[0].geometry.coordinates[0];

      const events = await getConnection().query(`
      select e.*
      from event e
      where e.location ILIKE '%${city}%'
    `);

      return { events, coordinates: { lat: latitude, long: longitude } };
    }
    const events = await Event.find({});
    return { events, coordinates: { lat: 51, long: 10 } };
  }

  @Mutation(() => EventResponse)
  @UseMiddleware(isAuth)
  async createEvent(
    @Arg("name", () => String) name: string,
    @Arg("location", () => String) location: string,
    @Arg("description", () => String) description: string,
    @Arg("eventDate", () => String) eventDate: string,
    @Arg("eventTime", () => String) eventTime: string,
    @Arg("file", () => GraphQLUpload, { nullable: true })
    file: FileUpload,
    @Ctx() { req }: MyContext
  ): Promise<EventResponse> {
    if (location.trim().length === 0) {
      return {
        errors: [
          {
            field: "location",
            message: "Please enter a location for your event",
          },
        ],
      };
    }

    const coordsData = await getCoordsByAddress(location);
    if (!coordsData || coordsData.features.length === 0) {
      return {
        errors: [
          {
            field: "location",
            message: "Could not find location for the entered address",
          },
        ],
      };
    }

    const latitude = coordsData.features[0].geometry.coordinates[1];
    const longitude = coordsData.features[0].geometry.coordinates[0];

    if (name.trim().length === 0) {
      return {
        errors: [
          {
            field: "name",
            message: "Please enter a name for your event",
          },
        ],
      };
    }

    let image = DEFAULT_PIC;
    if (file) {
      image = await cloudinaryUpload(file.createReadStream());
    }

    const event = await Event.create({
      name,
      location,
      latitude,
      eventDate,
      eventTime,
      longitude,
      description,
      image,
      creatorId: req.session.userId,
    }).save();

    return {
      event,
    };
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async joinEvent(
    @Arg("eventId", () => Int) eventId: number,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    const { userId } = req.session;
    const user = await User.findOne({ id: userId });
    if (!user) {
      return false;
    }

    const event = await Event.findOne({ id: eventId });
    if (!event) {
      return false;
    }

    await getConnection()
      .createQueryBuilder()
      .relation(User, "myevents")
      .of(user)
      .add(event);

    return true;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteEvent(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    await Event.delete({ id, creatorId: req.session.userId });
    return true;
  }
}
