// webpack.config.js

const path = require('path');

module.exports = {
    entry: './src/index.ts', // Entry point for the application
    output: {
        filename: 'bundle.js', // Name of the output bundle
        path: path.resolve(__dirname, 'dist'), // Output directory
    },
    mode: 'production', // Production mode enables optimizations like minification
    module: {
        rules: [
            {
                test: /\.ts$/, // Apply this rule to .ts files
                use: 'ts-loader', // Use ts-loader to transpile TypeScript to JavaScript
                exclude: /node_modules/, // Exclude node_modules directory
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'], // Resolve these file extensions
    },
    optimization: {
        minimize: true, // Enable minification
        usedExports: true, // Enable tree shaking
    },
};