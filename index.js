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
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateFiles = void 0;
var fs = __importStar(require("fs"));
var path = require("path");
var As2Ts_1 = require("./gen/As2Ts");
var TsMaker_1 = require("./gen/TsMaker");
var parser = require("@typescript-eslint/typescript-estree");
var as2ts;
var tsMaker;
var optionExample = {
    skipRule: {
        "dirs": [/^ui\//, /^automatic/],
        "files": [/ActHomeView\.as/, /MsgPool\.as/, /FyMsg\.as/, /DecodeUtil\.as/, /EncodeUtil\.as/]
    },
    idReplacement: {
        "KW": "KeyWord"
    },
    literalReplacement: {
        "\"automatic/constants/KW\"": "\"automatic/constants/KeyWord\""
    },
    typeMapper: {
        "int": "number",
        "Number": "number",
        "uint": "number",
        "Boolean": "boolean",
        "String": "string",
        "Object": "any"
    },
    importRule: {
        "fromModule": [
            { "module": "Laya", "regular": new RegExp("^laya") }
        ]
    }
};
var inputFolder;
var outputFolder;
var transOption;
translateFiles('E:\\qhgame\\trunk\\project\\src\\', 'E:\\qhgame\\tsproj\\src\\', optionExample);
function translateFiles(inputPath, outputPath, option) {
    inputFolder = inputPath;
    outputFolder = outputPath;
    transOption = option;
    if (!as2ts) {
        as2ts = new As2Ts_1.As2Ts();
        tsMaker = new TsMaker_1.TsMaker(option);
    }
    var inputStat = fs.statSync(inputPath);
    if (inputStat.isFile()) {
        doTranslateFile(inputPath);
    }
    else {
        readDir(inputPath);
    }
    console.log('translation finished.');
}
exports.translateFiles = translateFiles;
function readDir(dirPath) {
    if (transOption && transOption.skipRule && transOption.skipRule.dirs) {
        var relativePath = path.relative(inputFolder, dirPath);
        for (var _i = 0, _a = transOption.skipRule.dirs; _i < _a.length; _i++) {
            var sd = _a[_i];
            if (sd.test(relativePath)) {
                return;
            }
        }
    }
    var files = fs.readdirSync(dirPath);
    for (var i = 0, len = files.length; i < len; i++) {
        var filename = files[i];
        var filePath = path.join(dirPath, filename);
        var fileStat = fs.statSync(filePath);
        if (fileStat.isFile()) {
            var fileExt = path.extname(filename).toLowerCase();
            if ('.as' == fileExt) {
                doTranslateFile(filePath);
            }
        }
        else {
            readDir(filePath);
        }
    }
}
function doTranslateFile(filePath) {
    if (filePath.indexOf('DeviceHTML5.as') < 0)
        return;
    var relativePath = path.relative(inputFolder, filePath);
    if (transOption && transOption.skipRule && transOption.skipRule.files) {
        for (var _i = 0, _a = transOption.skipRule.files; _i < _a.length; _i++) {
            var sf = _a[_i];
            if (sf.test(relativePath)) {
                return;
            }
        }
    }
    console.log('parsing: ', filePath);
    var outFilePath = filePath.replace(inputFolder, outputFolder);
    var outFilePP = path.parse(outFilePath);
    var tsContent = as2ts.translate(filePath);
    // 分析语法树
    var ast = parser.parse(tsContent, { loc: true, range: true });
    // console.log(JSON.stringify(ast));
    var relativePP = path.parse(relativePath);
    tsContent = tsMaker.make(ast, relativePP.dir.replace('\\', '/') + '/');
    var tsFilePath = outFilePath.replace(/\.as$/, '.ts');
    if (!fs.existsSync(outFilePP.dir))
        fs.mkdirSync(outFilePP.dir, { recursive: true });
    fs.writeFileSync(tsFilePath, tsContent);
}
