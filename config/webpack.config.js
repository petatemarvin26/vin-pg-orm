const TsPathPlugin = require('tsconfig-paths-webpack-plugin');
const TsErrorPlugin = require('fork-ts-checker-webpack-plugin');

const {TS_FILE} = require('./constants');
const {resolver} = require('./utils');

/**
 *
 * @param {object} env
 * @returns {import('webpack').Configuration}
 */
module.exports = (env) => {
  return {
    mode: 'production',
    target: 'web',
    entry: {
      index: {
        import: resolver('src/index.ts'),
        filename: './index.js'
      },
      classes: {
        import: resolver('src/classes/index.ts'),
        filename: './classes/index.js'
      },
      common: {
        import: resolver('src/common/index.ts'),
        filename: './common/index.js'
      }
    },
    output: {
      path: resolver('lib'),
      library: {
        type: 'module'
      }
    },
    module: {
      rules: [
        {
          test: TS_FILE,
          loader: 'babel-loader',
          exclude: /node_modules/,
          options: {
            configFile: resolver('config/.babelrc')
          }
        }
      ]
    },
    experiments: {
      outputModule: true
    },
    externals: {
      pg: 'pg'
    },
    plugins: [new TsErrorPlugin()],
    resolve: {
      extensions: ['.js', '.ts'],
      plugins: [
        new TsPathPlugin({
          configFile: resolver('tsconfig.json')
        })
      ]
    }
  };
};
