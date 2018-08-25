module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      }
    ]
  },
  entry: {
    graph: './src/graph.js',
  },
  output: {
    filename: '[name].js',
  },
};
