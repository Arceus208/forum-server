import axios from "axios";

export const getCoordsByAddress = async (address: string) => {
  const response = await axios.get(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address
    )}.json?access_token=${process.env.MAPBOX_TOKEN}`
  );

  const data = response.data;
  return data;
};
