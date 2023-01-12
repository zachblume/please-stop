const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  entry: {
    app: "./index.js",
  },
  mode: "development",
  target: "web",
  devtool: "inline-source-map",
  devServer: {
    port: 80,
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Hot Module Replacement",
    }),
    // Plugin for hot module replacement
    new webpack.HotModuleReplacementPlugin(),
  ],
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    // clean: true,
  },
};
