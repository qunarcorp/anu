"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const webpack_config_base_1 = __importDefault(require("./webpack.config.base"));
const path = __importStar(require("path"));
const webpack_merge_1 = __importDefault(require("webpack-merge"));
const pageWrapper = path.resolve(process.cwd(), "node_modules/schnee-ui/h5/components/pageWrapper");
const config = webpack_merge_1.default(webpack_config_base_1.default, {
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                loader: require.resolve('babel-loader'),
                options: {
                    cacheDirectory: true,
                    root: pageWrapper,
                    plugins: [
                        require.resolve('@babel/plugin-transform-runtime'),
                        require.resolve('@babel/plugin-syntax-dynamic-import'),
                        require.resolve('@babel/plugin-proposal-object-rest-spread'),
                        [require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
                        [require.resolve('@babel/plugin-proposal-class-properties'), { loose: true }]
                    ],
                    presets: [require.resolve('@babel/preset-react')]
                }
            }
        ]
    },
    optimization: {
        noEmitOnErrors: true
    },
    performance: {
        hints: false
    }
});
exports.default = config;
module.exports = config;
