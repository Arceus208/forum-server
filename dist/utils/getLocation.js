"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoordsByAddress = void 0;
const axios_1 = __importDefault(require("axios"));
const getCoordsByAddress = async (address) => {
    const response = await axios_1.default.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${process.env.MAPBOX_TOKEN}`);
    const data = response.data;
    return data;
};
exports.getCoordsByAddress = getCoordsByAddress;
//# sourceMappingURL=getLocation.js.map