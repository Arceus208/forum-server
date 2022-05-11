import cloudinary from "cloudinary";

export const cloudinaryUpload = async (createReadStream: any) => {
  cloudinary.v2.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
  });

  let resultUrl = "";
  let resultSecureUrl = "";

  const upload = async (createReadStream: any) => {
    try {
      await new Promise((resolve, reject) => {
        const streamLoad = cloudinary.v2.uploader.upload_stream(
          { folder: "reddit" },
          (error, result) => {
            if (result) {
              resultUrl = result.url;
              resultSecureUrl = result.secure_url;
              resolve(resultUrl);
            } else {
              reject(error);
            }
          }
        );

        createReadStream.pipe(streamLoad);
      });
    } catch (err) {
      throw new Error(`Failed to upload file! Error:${err.message}`);
    }
  };
  await upload(createReadStream);
  return resultUrl;
};
