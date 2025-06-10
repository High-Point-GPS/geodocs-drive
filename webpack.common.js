const path = require('path');
const webpack = require('webpack');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
	plugins: [
		new HtmlWebPackPlugin({
			template: './src/app/hpgpsFilemanagerDrive.html',

			filename: './hpgpsFilemanagerDrive.html',
		}),
		new MiniCssExtractPlugin({
			filename: '[name].css',
			chunkFilename: '[id].css',
		}),
		new webpack.HotModuleReplacementPlugin(),
	],
	output: {
		path: path.resolve(__dirname, 'docs'),
		filename: 'hpgpsFilemanagerDrive.js',
	},
};
