const cloudFrontDomain = import.meta.env.VITE_CLOUDFRONT_DOMAIN;

export const getCloudFrontPlaylistUrl = (objectKey) => {
  if (!objectKey || !cloudFrontDomain) return null;

  return `https://${cloudFrontDomain}/${objectKey.replace(/^\/+/, "")}`;
};
