module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Suppress the face-api.js "Can't resolve 'fs'" warning.
      // face-api.js contains a Node.js file-system code path that is never
      // executed in the browser. Telling webpack to treat 'fs' as empty
      // removes the warning without affecting runtime behaviour.
      webpackConfig.resolve = webpackConfig.resolve || {};
      webpackConfig.resolve.fallback = {
        ...(webpackConfig.resolve.fallback || {}),
        fs: false,
      };
      return webpackConfig;
    },
  },
};
