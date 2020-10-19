import * as fs from 'fs';
import path = require('path');
import {AsTranslator} from './gen/AsTranslator';
import {TsMaker} from './gen/TsMaker';
import {TsAnalysor} from './gen/TsAnalysor';
import parser = require('@typescript-eslint/typescript-estree');
import { As2TsOption } from '../typings';

enum As2TsPhase {
    Analyse, 
    Make
}

const DefaultTypeMapper = {
    "int": "number", 
    "Number": "number", 
    "uint": "number", 
    "Boolean": "boolean", 
    "String": "string", 
    "Object": "any"
};

const DefaultMethordMapper = {
    "trace": "console.log"
};

export default class Main {    
    private tsTranslator: AsTranslator;
    private tsAnalysor: TsAnalysor;
    private tsMaker: TsMaker;

    private inputFolder: string;
    private outputFolder: string;
    private transOption: As2TsOption;
    
    private lastConfPath: string;
    private tmpTsDir: string;
    private tmpAstDir: string;
    private continueLast: boolean;
    private lastCacheFile: string;
    private hasMeetLast: boolean;

    /**不支持内联函数、函数语句、单行声明多个成员变量 */
    translateFiles(inputPath: string, outputPath: string, ruleFilePath?: string) {
        let startAt = (new Date()).getTime();
        this.inputFolder = inputPath;
        this.outputFolder = outputPath;
        
        this.transOption = {};
        if(ruleFilePath && fs.existsSync(ruleFilePath)) {
            let ruleSt = fs.statSync(ruleFilePath);
            if(ruleSt.isFile()) {                    
                let fileExt = path.extname(ruleFilePath).toLowerCase();
                if ('.json' == fileExt) {
                    let ruleContent = fs.readFileSync(ruleFilePath, 'utf-8');
                    this.transOption = JSON.parse(ruleContent);
                }
            }
        }
        if(!this.transOption.typeMapper) {
            this.transOption.typeMapper = this.mergeOption(this.transOption.typeMapper, DefaultTypeMapper);
            this.transOption.methordMapper = this.mergeOption(this.transOption.methordMapper, DefaultMethordMapper);
        }

        if(!this.transOption.tmpRoot) {
            this.transOption.tmpRoot = 'tmp/';
        }
        this.lastConfPath = this.transOption.tmpRoot + '/last.txt';
        this.tmpTsDir = this.transOption.tmpRoot + '/ts/';
        this.tmpAstDir = this.transOption.tmpRoot + '/ast/';
        if (!fs.existsSync(this.tmpTsDir)) fs.mkdirSync(this.tmpTsDir, { recursive: true });
        if (!fs.existsSync(this.tmpAstDir)) fs.mkdirSync(this.tmpAstDir, { recursive: true });

        this.continueLast = false;
        if(this.transOption.continueLast && this.transOption.tmpRoot && fs.existsSync(this.lastConfPath)) {
            let lastConf = fs.readFileSync(this.lastConfPath, 'utf-8');
            let lastConfArr = lastConf.split('|');
            if(lastConfArr.length >= 3 && inputPath == lastConfArr[0] && outputPath == lastConfArr[1]) {
                this.continueLast = true;
                this.lastCacheFile = lastConfArr[2];
                this.hasMeetLast = false;
            }
        }
        if(this.transOption.continueLast && !this.continueLast) {
            console.log('[WARN]No last configuration found: %s, the option "continueLast" won\'t work.', this.lastConfPath);
        }

        if(!this.tsTranslator) {
            this.tsTranslator = new AsTranslator();
            this.tsAnalysor = new TsAnalysor(this.transOption);
            this.tsMaker = new TsMaker(this.tsAnalysor, this.transOption);
        }

        if(this.transOption.tsLibs) {
            for(let i = 0, len = this.transOption.tsLibs.length; i < len; i++) {
                let tsPath = this.transOption.tsLibs[i];

                let tsStat = fs.statSync(tsPath);
                if(tsStat.isFile()) {
                    this.readLibFile(tsPath);
                } else {
                    this.readLibDir(tsPath);
                }
            }
        }

        let inputStat = fs.statSync(inputPath);
        if(inputStat.isFile()) {
            this.doTranslateFile(inputPath, As2TsPhase.Analyse);
            this.dumpAnalysor();
            this.hasMeetLast = false;
            this.doTranslateFile(inputPath, As2TsPhase.Make);
        } else {
            this.readDir(inputPath, As2TsPhase.Analyse);
            this.dumpAnalysor();
            this.hasMeetLast = false;
            this.readDir(inputPath, As2TsPhase.Make);
        }
        let now = (new Date()).getTime();
        console.log('translation finished, %fs costed.', ((now - startAt) / 1000).toFixed(1));
    }

    private readDir(dirPath: string, phase: As2TsPhase) {
        if(this.transOption.skipRule && this.transOption.skipRule.dirs) {
            let relativePath = path.relative(this.inputFolder, dirPath);
            for(let sd of this.transOption.skipRule.dirs) {
                if(new RegExp(sd).test(relativePath)) {
                    return;
                }
            }
        }
        let files = fs.readdirSync(dirPath);
        for(let i = 0, len = files.length; i < len; i++) {
            let filename = files[i];
            let filePath = path.join(dirPath, filename);
            let fileStat = fs.statSync(filePath);
            if (fileStat.isFile()) {
                let fileExt = path.extname(filename).toLowerCase();
                if ('.as' == fileExt) {
                    this.doTranslateFile(filePath, phase);
                }
            } else {
                this.readDir(filePath, phase);
            }
        }
    }

    private doTranslateFile(filePath: string, phase: As2TsPhase) {
        // if(filePath.indexOf('WanXianPanel.as')<0) return;
        let relativePath = path.relative(this.inputFolder, filePath);
        if(this.transOption.skipRule && this.transOption.skipRule.files) {
            for(let sf of this.transOption.skipRule.files) {
                if(new RegExp(sf).test(relativePath)) {
                    return;
                }
            }
        }
        if(this.continueLast && this.lastCacheFile && !this.hasMeetLast) {
            if(filePath == this.lastCacheFile) {
                this.hasMeetLast = true;
            } else {
                return;
            }
        }

        fs.writeFileSync(this.lastConfPath, this.inputFolder + '|' + this.outputFolder + '|' + filePath);

        let tmpAstPath = this.tmpAstDir + relativePath.replace('.as', '.json');
        if(phase == As2TsPhase.Analyse) {
            console.log('\x1B[1A\x1B[Kparsing: %s', filePath);    
            let tsContent = this.tsTranslator.translate(filePath);
            if(this.transOption.tmpRoot) {
                let tmpTsPath = this.tmpTsDir + relativePath.replace('.as', '.ts');
                let tmpTsPP = path.parse(tmpTsPath);
                if (!fs.existsSync(tmpTsPP.dir)) fs.mkdirSync(tmpTsPP.dir, { recursive: true });
                fs.writeFileSync(tmpTsPath, tsContent);
            }
        
            // 分析语法树
            const ast = parser.parse(tsContent); //, {loc: true, range: true}
            if(this.transOption.tmpRoot) {
                let tmpAstPP = path.parse(tmpAstPath);
                if (!fs.existsSync(tmpAstPP.dir)) fs.mkdirSync(tmpAstPP.dir, { recursive: true });
                fs.writeFileSync(tmpAstPath, JSON.stringify(ast));
            }
            this.tsAnalysor.collect(ast, filePath, relativePath);
        } else {
            let outFilePath = filePath.replace(this.inputFolder, this.outputFolder);
            let tsFilePath = outFilePath.replace(/\.as$/, '.ts');
            console.log('\x1B[1A\x1B[Kmaking: %s', tsFilePath);    
            let astContent = fs.readFileSync(tmpAstPath, 'utf-8');
            let tsContent = this.tsMaker.make(JSON.parse(astContent), this.inputFolder, filePath);
            let outFilePP = path.parse(outFilePath);
            if (!fs.existsSync(outFilePP.dir)) fs.mkdirSync(outFilePP.dir, { recursive: true });
            fs.writeFileSync(tsFilePath, tsContent);
        }
    }

    private readLibDir(dirPath: string) {
        let files = fs.readdirSync(dirPath);
        for(let i = 0, len = files.length; i < len; i++) {
            let filename = files[i];
            let filePath = path.join(dirPath, filename);
            let fileStat = fs.statSync(filePath);
            if (fileStat.isFile()) {
                let fileExt = path.extname(filename).toLowerCase();
                if ('.ts' == fileExt) {
                    this.readLibFile(filePath);
                }
            } else {
                this.readLibDir(filePath);
            }
        }
    }

    private readLibFile(filePath: string) {
        let tsContent = fs.readFileSync(filePath, 'utf-8');
        // 分析语法树
        const ast = parser.parse(tsContent); //, {loc: true, range: true}
        this.tsAnalysor.collect(ast, filePath);
    }

    private dumpAnalysor() {
        let analysorInfoPath = this.transOption.tmpRoot + '/analysor.txt';
        fs.writeFileSync(analysorInfoPath, this.tsAnalysor.toString());
    }

    private mergeOption(a: any, b: any) {
        if(!a) a = {};
        for(let bkey in b) {
            if(!a[bkey]) {
                a[bkey] = b[bkey];
            }
        }
        return a;
    }
}