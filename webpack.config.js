const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    background: './src/background/index.ts',
    client: './src/client/index.tsx'
  },
  mode: "production",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          "sass-loader",
        ],
      },
      {
        test: /\.css?$/,
        use: [
          "style-loader",
          "css-loader"
        ],
      }
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "react/jsx-runtime": "react/jsx-runtime.js",
      "react/jsx-dev-runtime": "react/jsx-dev-runtime.js"
    }
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/client/index.html", to: "." },
        { from: "manifest.json", to: "." },
      ],
    }),
  ],
  watchOptions: {
    ignored: ["**/node_modules", "dist"],
  }
};
