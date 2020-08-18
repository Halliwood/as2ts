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
var fs = __importStar(require("fs"));
var path = require("path");
var AsTranslator_1 = require("./gen/AsTranslator");
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
var Main = /** @class */ (function () {
    function Main() {
    }
    /**不支持内联函数、函数语句、单行声明多个成员变量 */
    Main.prototype.translateFiles = function (inputPath, outputPath, ruleFilePath) {
        var startAt = (new Date()).getTime();
        this.inputFolder = inputPath;
        this.outputFolder = outputPath;
        this.transOption = {};
        if (ruleFilePath && fs.existsSync(ruleFilePath)) {
            var ruleSt = fs.statSync(ruleFilePath);
            if (ruleSt.isFile()) {
                var fileExt = path.extname(ruleFilePath).toLowerCase();
                if ('.json' == fileExt) {
                    var ruleContent = fs.readFileSync(ruleFilePath, 'utf-8');
                    this.transOption = JSON.parse(ruleContent);
                }
            }
        }
        if (!this.transOption.typeMapper) {
            this.transOption.typeMapper = this.mergeOption(this.transOption.typeMapper, DefaultTypeMapper);
            this.transOption.methordMapper = this.mergeOption(this.transOption.methordMapper, DefaultMethordMapper);
        }
        if (!this.transOption.tmpRoot) {
            this.transOption.tmpRoot = 'tmp/';
        }
        this.lastConfPath = this.transOption.tmpRoot + '/last.txt';
        this.tmpTsDir = this.transOption.tmpRoot + '/ts/';
        this.tmpAstDir = this.transOption.tmpRoot + '/ast/';
        if (!fs.existsSync(this.tmpTsDir))
            fs.mkdirSync(this.tmpTsDir, { recursive: true });
        if (!fs.existsSync(this.tmpAstDir))
            fs.mkdirSync(this.tmpAstDir, { recursive: true });
        this.continueLast = false;
        if (this.transOption.continueLast && this.transOption.tmpRoot && fs.existsSync(this.lastConfPath)) {
            var lastConf = fs.readFileSync(this.lastConfPath, 'utf-8');
            var lastConfArr = lastConf.split('|');
            if (lastConfArr.length >= 3 && inputPath == lastConfArr[0] && outputPath == lastConfArr[1]) {
                this.continueLast = true;
                this.lastCacheFile = lastConfArr[2];
                this.hasMeetLast = false;
            }
        }
        if (this.transOption.continueLast && !this.continueLast) {
            console.log('[WARN]No last configuration found: %s, the option "continueLast" won\'t work.', this.lastConfPath);
        }
        if (!this.tsTranslator) {
            this.tsTranslator = new AsTranslator_1.AsTranslator();
            this.tsAnalysor = new TsAnalysor_1.TsAnalysor(this.transOption);
            this.tsMaker = new TsMaker_1.TsMaker(this.tsAnalysor, this.transOption);
        }
        if (this.transOption.tsLibs) {
            for (var i = 0, len = this.transOption.tsLibs.length; i < len; i++) {
                var tsPath = this.transOption.tsLibs[i];
                var tsStat = fs.statSync(tsPath);
                if (tsStat.isFile()) {
                    this.readLibFile(tsPath);
                }
                else {
                    this.readLibDir(tsPath);
                }
            }
        }
        var inputStat = fs.statSync(inputPath);
        if (inputStat.isFile()) {
            this.doTranslateFile(inputPath, As2TsPhase.Analyse);
            this.dumpAnalysor();
            this.hasMeetLast = false;
            this.doTranslateFile(inputPath, As2TsPhase.Make);
        }
        else {
            this.readDir(inputPath, As2TsPhase.Analyse);
            this.dumpAnalysor();
            this.hasMeetLast = false;
            this.readDir(inputPath, As2TsPhase.Make);
        }
        var now = (new Date()).getTime();
        console.log('translation finished, %fs costed.', ((now - startAt) / 1000).toFixed(1));
    };
    Main.prototype.readDir = function (dirPath, phase) {
        if (this.transOption.skipRule && this.transOption.skipRule.dirs) {
            var relativePath = path.relative(this.inputFolder, dirPath);
            for (var _i = 0, _a = this.transOption.skipRule.dirs; _i < _a.length; _i++) {
                var sd = _a[_i];
                if (new RegExp(sd).test(relativePath)) {
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
                    this.doTranslateFile(filePath, phase);
                }
            }
            else {
                this.readDir(filePath, phase);
            }
        }
    };
    Main.prototype.doTranslateFile = function (filePath, phase) {
        // if(filePath.indexOf('HongBaoYouLiItem.as')<0) return;
        var relativePath = path.relative(this.inputFolder, filePath);
        if (this.transOption.skipRule && this.transOption.skipRule.files) {
            for (var _i = 0, _a = this.transOption.skipRule.files; _i < _a.length; _i++) {
                var sf = _a[_i];
                if (new RegExp(sf).test(relativePath)) {
                    return;
                }
            }
        }
        if (this.continueLast && this.lastCacheFile && !this.hasMeetLast) {
            if (filePath == this.lastCacheFile) {
                this.hasMeetLast = true;
            }
            else {
                return;
            }
        }
        fs.writeFileSync(this.lastConfPath, this.inputFolder + '|' + this.outputFolder + '|' + filePath);
        var tmpAstPath = this.tmpAstDir + relativePath.replace('.as', '.json');
        if (phase == As2TsPhase.Analyse) {
            console.log('\x1B[1A\x1B[Kparsing: %s', filePath);
            var tsContent = this.tsTranslator.translate(filePath);
            if (this.transOption.tmpRoot) {
                var tmpTsPath = this.tmpTsDir + relativePath.replace('.as', '.ts');
                var tmpTsPP = path.parse(tmpTsPath);
                if (!fs.existsSync(tmpTsPP.dir))
                    fs.mkdirSync(tmpTsPP.dir, { recursive: true });
                fs.writeFileSync(tmpTsPath, tsContent);
            }
            // 分析语法树
            var ast = parser.parse(tsContent); //, {loc: true, range: true}
            if (this.transOption.tmpRoot) {
                var tmpAstPP = path.parse(tmpAstPath);
                if (!fs.existsSync(tmpAstPP.dir))
                    fs.mkdirSync(tmpAstPP.dir, { recursive: true });
                fs.writeFileSync(tmpAstPath, JSON.stringify(ast));
            }
            this.tsAnalysor.collect(ast, filePath, relativePath);
        }
        else {
            var outFilePath = filePath.replace(this.inputFolder, this.outputFolder);
            var tsFilePath = outFilePath.replace(/\.as$/, '.ts');
            console.log('\x1B[1A\x1B[Kmaking: %s', tsFilePath);
            var astContent = fs.readFileSync(tmpAstPath, 'utf-8');
            var tsContent = this.tsMaker.make(JSON.parse(astContent), relativePath);
            var outFilePP = path.parse(outFilePath);
            if (!fs.existsSync(outFilePP.dir))
                fs.mkdirSync(outFilePP.dir, { recursive: true });
            fs.writeFileSync(tsFilePath, tsContent);
        }
    };
    Main.prototype.readLibDir = function (dirPath) {
        var files = fs.readdirSync(dirPath);
        for (var i = 0, len = files.length; i < len; i++) {
            var filename = files[i];
            var filePath = path.join(dirPath, filename);
            var fileStat = fs.statSync(filePath);
            if (fileStat.isFile()) {
                var fileExt = path.extname(filename).toLowerCase();
                if ('.ts' == fileExt) {
                    this.readLibFile(filePath);
                }
            }
            else {
                this.readLibDir(filePath);
            }
        }
    };
    Main.prototype.readLibFile = function (filePath) {
        var tsContent = fs.readFileSync(filePath, 'utf-8');
        // 分析语法树
        var ast = parser.parse(tsContent); //, {loc: true, range: true}
        this.tsAnalysor.collect(ast, filePath);
    };
    Main.prototype.dumpAnalysor = function () {
        var analysorInfoPath = this.transOption.tmpRoot + '/analysor.txt';
        fs.writeFileSync(analysorInfoPath, this.tsAnalysor.toString());
    };
    Main.prototype.mergeOption = function (a, b) {
        if (!a)
            a = {};
        for (var bkey in b) {
            if (!a[bkey]) {
                a[bkey] = b[bkey];
            }
        }
        return a;
    };
    return Main;
}());
exports.default = Main;
