const webpack = require('webpack');
const Chain = require('webpack-chain');
const fs = require('fs-extra');
const path = require('path');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const getWebpackBase = require('rax-webpack-config');
const { getBabelConfig, setBabelAlias } = require('rax-compile-config');

module.exports = (context, options = {}, target) => {
  const { rootDir, command } = context;

  const babelConfig = getBabelConfig({
    styleSheet: true,
    ...options,
  });

  const config = getWebpackBase({
    ...context,
    babelConfig: babelConfig,
  });

  config.target('web');
  config.context(rootDir);

  setBabelAlias(config);

  config.resolve.extensions
    .merge([
      '.rml',
    ]);

  config.resolve.alias
    .set('@core/app', 'universal-app-runtime')
    .set('@core/page', 'universal-app-runtime')
    .set('@core/router', 'universal-app-runtime');

  // Process app.json file
  config.module.rule('appJSON')
    .type('javascript/auto')
    .test(/app\.json$/)
    .use('babel')
    .loader(require.resolve('babel-loader'))
    .options(babelConfig)
    .end()
    .use('loader')
    .loader(require.resolve('../loaders/AppConfigLoader'));

  // ReactML support
  config.module.rule('rml')
    .test(/\.rml$/i)
    .use('rml')
    .loader(require.resolve('@reactml/loader'))
    .options({
      renderer: 'rax',
      inlineStyle: context.userConfig.inlineStyle,
    })
    .end();

  config.module.rule('tsx')
    .use('ts')
    .loader(require.resolve('ts-loader'))
    .options({
      transpileOnly: true,
    })
    .end()
    .use('platform')
    .loader(require.resolve('rax-compile-config/src/platformLoader'));

  config.module.rule('jsx')
    .test(/\.(js|mjs|jsx)$/)
    .use('platform')
    .loader(require.resolve('rax-compile-config/src/platformLoader'));

  if (target && fs.existsSync(path.resolve(rootDir, 'src/public'))) {
    config.plugin('copyWebpackPlugin')
      .use(CopyWebpackPlugin, [[{ from: 'src/public', to: `${target}/public` }]]);
  }

  const copyWebpackPluginPatterns = [{ from: 'src/public', to: `${target}/public` }];

  if (command === 'start') {
    // MiniApp usually use `./public/xxx.png` as file src.
    // Dev Server start with '/'. if you want to use './public/xxx.png', should copy public to the root.
    copyWebpackPluginPatterns.push({ from: 'src/public', to: 'public' });
  }

  if (target && fs.existsSync(path.resolve(rootDir, 'src/public'))) {
    config.plugin('copyWebpackPlugin')
      .use(CopyWebpackPlugin, [copyWebpackPluginPatterns]);
  }

  return config;
};
