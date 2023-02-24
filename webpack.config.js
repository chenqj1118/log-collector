const path = require('path');

module.exports = {
  // 环境
  mode: 'none',
  entry: './test/test.js',
  devtool: 'source-map',
  output: {
    // 虚拟路径，不会真实生成
    publicPath: '/log/',
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: []
  },
  devServer: {
    // 端口号
    port: 8080,
    // 静态资源文件夹
    static: {
      directory: 'www'
    },
    proxy: {
      // 设置代理
      "/router": {
        target: `http://localhost:8091/router/`,
        changeOrigin: true,
        pathRewrite: {
          "^/router": ""
        }
      }
    }
  },
};