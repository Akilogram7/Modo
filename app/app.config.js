
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    console.warn("GOOGLE_MAPS_API_KEY is not set.");
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ],
  };
};
