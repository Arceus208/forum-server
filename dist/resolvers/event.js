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
exports.EventResolver = void 0;
const Event_1 = require("../entities/Event");
const type_graphql_1 = require("type-graphql");
const graphql_upload_1 = require("graphql-upload");
const isAuth_1 = require("../middlewares/isAuth");
const getLocation_1 = require("../utils/getLocation");
const user_1 = require("./user");
const User_1 = require("../entities/User");
const constants_1 = require("../constants");
const cloudinaryUpload_1 = require("../utils/cloudinaryUpload");
const typeorm_1 = require("typeorm");
let EventResponse = class EventResponse {
};
__decorate([
    (0, type_graphql_1.Field)(() => [user_1.FieldError], { nullable: true }),
    __metadata("design:type", Array)
], EventResponse.prototype, "errors", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => Event_1.Event, { nullable: true }),
    __metadata("design:type", Event_1.Event)
], EventResponse.prototype, "event", void 0);
EventResponse = __decorate([
    (0, type_graphql_1.ObjectType)()
], EventResponse);
let Coordiantes = class Coordiantes {
};
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", Number)
], Coordiantes.prototype, "lat", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", Number)
], Coordiantes.prototype, "long", void 0);
Coordiantes = __decorate([
    (0, type_graphql_1.ObjectType)()
], Coordiantes);
let EventsByCityResponse = class EventsByCityResponse {
};
__decorate([
    (0, type_graphql_1.Field)(() => Coordiantes, { nullable: true }),
    __metadata("design:type", Coordiantes)
], EventsByCityResponse.prototype, "coordinates", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => [Event_1.Event]),
    __metadata("design:type", Array)
], EventsByCityResponse.prototype, "events", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => String, { nullable: true }),
    __metadata("design:type", String)
], EventsByCityResponse.prototype, "error", void 0);
EventsByCityResponse = __decorate([
    (0, type_graphql_1.ObjectType)()
], EventsByCityResponse);
let EventResolver = class EventResolver {
    async hostName(root) {
        const user = await User_1.User.findOne({ id: root.creatorId });
        return user === null || user === void 0 ? void 0 : user.username;
    }
    async getEvents() {
        const events = await Event_1.Event.find({});
        return events;
    }
    async event(id) {
        const event = await Event_1.Event.findOne({ id });
        return event;
    }
    async myevents({ req }) {
        const { userId } = req.session;
        const events = await (0, typeorm_1.getConnection)().query(`
      select *
      from event e
      inner join user_myevents_event as ume on ume."eventId" =  e.id
      where ume."userId" = ${userId} 
    `);
        return events;
    }
    async getEventsByCity(city) {
        if (city.trim().length !== 0) {
            const coordsData = await (0, getLocation_1.getCoordsByAddress)(city);
            if (!coordsData || coordsData.features.length === 0) {
                return {
                    events: [],
                    error: "No matches city",
                };
            }
            const latitude = coordsData.features[0].geometry.coordinates[1];
            const longitude = coordsData.features[0].geometry.coordinates[0];
            const events = await (0, typeorm_1.getConnection)().query(`
      select e.*
      from event e
      where e.location ILIKE '%${city}%'
    `);
            return { events, coordinates: { lat: latitude, long: longitude } };
        }
        const events = await Event_1.Event.find({});
        return { events, coordinates: { lat: 51, long: 10 } };
    }
    async createEvent(name, location, description, eventDate, eventTime, file, { req }) {
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
        const coordsData = await (0, getLocation_1.getCoordsByAddress)(location);
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
        let image = constants_1.DEFAULT_PIC;
        if (file) {
            image = await (0, cloudinaryUpload_1.cloudinaryUpload)(file.createReadStream());
        }
        const event = await Event_1.Event.create({
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
    async joinEvent(eventId, { req }) {
        const { userId } = req.session;
        const user = await User_1.User.findOne({ id: userId });
        if (!user) {
            return false;
        }
        const event = await Event_1.Event.findOne({ id: eventId });
        if (!event) {
            return false;
        }
        await (0, typeorm_1.getConnection)()
            .createQueryBuilder()
            .relation(User_1.User, "myevents")
            .of(user)
            .add(event);
        return true;
    }
    async deleteEvent(id, { req }) {
        await Event_1.Event.delete({ id, creatorId: req.session.userId });
        return true;
    }
};
__decorate([
    (0, type_graphql_1.FieldResolver)(() => String),
    __param(0, (0, type_graphql_1.Root)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Event_1.Event]),
    __metadata("design:returntype", Promise)
], EventResolver.prototype, "hostName", null);
__decorate([
    (0, type_graphql_1.Query)(() => [Event_1.Event]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EventResolver.prototype, "getEvents", null);
__decorate([
    (0, type_graphql_1.Query)(() => Event_1.Event || { nullable: true }),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], EventResolver.prototype, "event", null);
__decorate([
    (0, type_graphql_1.Query)(() => [Event_1.Event]),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventResolver.prototype, "myevents", null);
__decorate([
    (0, type_graphql_1.Query)(() => EventsByCityResponse),
    __param(0, (0, type_graphql_1.Arg)("city", () => String)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EventResolver.prototype, "getEventsByCity", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => EventResponse),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("name", () => String)),
    __param(1, (0, type_graphql_1.Arg)("location", () => String)),
    __param(2, (0, type_graphql_1.Arg)("description", () => String)),
    __param(3, (0, type_graphql_1.Arg)("eventDate", () => String)),
    __param(4, (0, type_graphql_1.Arg)("eventTime", () => String)),
    __param(5, (0, type_graphql_1.Arg)("file", () => graphql_upload_1.GraphQLUpload, { nullable: true })),
    __param(6, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], EventResolver.prototype, "createEvent", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("eventId", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], EventResolver.prototype, "joinEvent", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("id", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], EventResolver.prototype, "deleteEvent", null);
EventResolver = __decorate([
    (0, type_graphql_1.Resolver)(Event_1.Event)
], EventResolver);
exports.EventResolver = EventResolver;
//# sourceMappingURL=event.js.map