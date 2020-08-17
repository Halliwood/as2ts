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
var TsAnalysor_1 = require("./gen/TsAnalysor");
var parser = require("@typescript-eslint/typescript-estree");
var As2TsPhase;
(function (As2TsPhase) {
    As2TsPhase[As2TsPhase["Analyse"] = 0] = "Analyse";
    As2TsPhase[As2TsPhase["Make"] = 1] = "Make";
})(As2TsPhase || (As2TsPhase = {}));
var DefaultTypeMapper = {
    "int": "number",
    "Number": "number",
    "uint": "number",
    "Boolean": "boolean",
    "String": "string",
    "Object": "any"
};
var DefaultMethordMapper = {
    "trace": "console.log"
};
var as2ts;
var tsAnalysor;
var tsMaker;
var optionExample = {
    skipRule: {
        "dirs": [/^\bui\b/, /^automatic/],
        "files": [/MsgPool\.as/, /FyMsg\.as/, /DecodeUtil\.as/, /EncodeUtil\.as/, /SendMsgUtil\.as/]
    },
    idReplacement: {
        "KW": "KeyWord"
    },
    literalReplacement: {
        "\"automatic/constants/KW\"": "\"automatic/constants/KeyWord\""
    },
    importRule: {
        "fromModule": [
            { "module": "Laya", "regular": new RegExp("^laya") },
            { "module": "ui", "regular": new RegExp("^ui/") },
            { "module": "Protocol", "regular": new RegExp("^automatic/protocol/(?!Macros|ErrorId)") },
            { "module": "GameConfig", "regular": new RegExp("^automatic/cfgs") }
        ]
    },
    errorDetail: true,
    terminateWhenError: true,
    continueLast: false,
    tmpRoot: 'tmp/'
};
var inputFolder;
var outputFolder;
var transOption;
var lastConfPath;
var tmpTsDir;
var tmpAstDir;
var continueLast;
var lastCacheFile;
var hasMeetLast;
translateFiles('E:\\qhgame\\trunk\\project\\src\\', 'E:\\qhgame\\tsproj\\src\\', optionExample);
/**不支持内联函数、函数语句、单行声明多个成员变量 */
function translateFiles(inputPath, outputPath, option) {
    inputFolder = inputPath;
    outputFolder = outputPath;
    transOption = option || {};
    if (!transOption.typeMapper) {
        transOption.typeMapper = mergeOption(transOption.typeMapper, DefaultTypeMapper);
        transOption.methordMapper = mergeOption(transOption.methordMapper, DefaultMethordMapper);
    }
    if (!transOption.tmpRoot) {
        transOption.tmpRoot = 'tmp/';
    }
    lastConfPath = transOption.tmpRoot + '/last.txt';
    tmpTsDir = transOption.tmpRoot + '/ts/';
    tmpAstDir = transOption.tmpRoot + '/ast/';
    if (!fs.existsSync(tmpTsDir))
        fs.mkdirSync(tmpTsDir, { recursive: true });
    if (!fs.existsSync(tmpAstDir))
        fs.mkdirSync(tmpAstDir, { recursive: true });
    continueLast = false;
    if (transOption.continueLast && transOption.tmpRoot && fs.existsSync(lastConfPath)) {
        var lastConf = fs.readFileSync(lastConfPath, 'utf-8');
        var lastConfArr = lastConf.split('|');
        if (lastConfArr.length >= 3 && inputPath == lastConfArr[0] && outputPath == lastConfArr[1]) {
            continueLast = true;
            lastCacheFile = lastConfArr[2];
            hasMeetLast = false;
        }
    }
    if (transOption.continueLast && !continueLast) {
        console.log('[WARN]No last configuration found: %s, the option "continueLast" won\'t work.', lastConfPath);
    }
    if (!as2ts) {
        as2ts = new As2Ts_1.As2Ts();
        tsAnalysor = new TsAnalysor_1.TsAnalysor(option);
        tsMaker = new TsMaker_1.TsMaker(tsAnalysor, option);
    }
    var inputStat = fs.statSync(inputPath);
    if (inputStat.isFile()) {
        doTranslateFile(inputPath, As2TsPhase.Analyse);
        dumpAnalysor();
        hasMeetLast = false;
        doTranslateFile(inputPath, As2TsPhase.Make);
    }
    else {
        readDir(inputPath, As2TsPhase.Analyse);
        dumpAnalysor();
        hasMeetLast = false;
        readDir(inputPath, As2TsPhase.Make);
    }
    console.log('translation finished.');
}
exports.translateFiles = translateFiles;
function readDir(dirPath, phase) {
    if (transOption.skipRule && transOption.skipRule.dirs) {
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
                doTranslateFile(filePath, phase);
            }
        }
        else {
            readDir(filePath, phase);
        }
    }
}
function doTranslateFile(filePath, phase) {
    // if(filePath.indexOf('TitleCanUseTipView.as')<0) return;
    var relativePath = path.relative(inputFolder, filePath);
    if (transOption.skipRule && transOption.skipRule.files) {
        for (var _i = 0, _a = transOption.skipRule.files; _i < _a.length; _i++) {
            var sf = _a[_i];
            if (sf.test(relativePath)) {
                return;
            }
        }
    }
    if (continueLast && lastCacheFile && !hasMeetLast) {
        if (filePath == lastCacheFile) {
            hasMeetLast = true;
        }
        else {
            return;
        }
    }
    fs.writeFileSync(lastConfPath, inputFolder + '|' + outputFolder + '|' + filePath);
    var tmpAstPath = tmpAstDir + relativePath.replace('.as', '.json');
    if (phase == As2TsPhase.Analyse) {
        console.log('\x1B[1A\x1B[Kparsing: %s', filePath);
        var tsContent = as2ts.translate(filePath);
        if (transOption.tmpRoot) {
            var tmpTsPath = tmpTsDir + relativePath.replace('.as', '.ts');
            var tmpTsPP = path.parse(tmpTsPath);
            if (!fs.existsSync(tmpTsPP.dir))
                fs.mkdirSync(tmpTsPP.dir, { recursive: true });
            fs.writeFileSync(tmpTsPath, tsContent);
        }
        // 分析语法树
        var ast = parser.parse(tsContent); //, {loc: true, range: true}
        if (transOption.tmpRoot) {
            var tmpAstPP = path.parse(tmpAstPath);
            if (!fs.existsSync(tmpAstPP.dir))
                fs.mkdirSync(tmpAstPP.dir, { recursive: true });
            fs.writeFileSync(tmpAstPath, JSON.stringify(ast));
        }
        tsAnalysor.collect(ast, relativePath);
    }
    else {
        var outFilePath = filePath.replace(inputFolder, outputFolder);
        var tsFilePath = outFilePath.replace(/\.as$/, '.ts');
        console.log('\x1B[1A\x1B[Kmaking: %s', tsFilePath);
        var astContent = fs.readFileSync(tmpAstPath, 'utf-8');
        var tsContent = tsMaker.make(JSON.parse(astContent), relativePath);
        var outFilePP = path.parse(outFilePath);
        if (!fs.existsSync(outFilePP.dir))
            fs.mkdirSync(outFilePP.dir, { recursive: true });
        fs.writeFileSync(tsFilePath, tsContent);
    }
}
function dumpAnalysor() {
    var analysorInfoPath = transOption.tmpRoot + '/analysor.txt';
    fs.writeFileSync(analysorInfoPath, tsAnalysor.toString());
}
function mergeOption(a, b) {
    if (!a)
        a = {};
    for (var bkey in b) {
        if (!a[bkey]) {
            a[bkey] = b[bkey];
        }
    }
    return a;
}
