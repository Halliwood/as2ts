import * as fs from 'fs';
import path = require('path');
import {As2Ts} from './gen/As2Ts';
import {TsMaker} from './gen/TsMaker';
import parser = require('@typescript-eslint/typescript-estree');
import { As2TsOption } from './gen';

let as2ts: As2Ts;
let tsMaker: TsMaker;
let optionExample: As2TsOption = {
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
            {"module": "Laya", "regular": new RegExp("^laya") }
        ]
    }
};

let inputFolder: string;
let outputFolder: string;
let transOption: As2TsOption;

translateFiles('E:\\qhgame\\trunk\\project\\src\\', 'E:\\qhgame\\tsproj\\src\\', optionExample);

export function translateFiles(inputPath: string, outputPath: string, option?: As2TsOption) {
    inputFolder = inputPath;
    outputFolder = outputPath;
    transOption = option;
    if(!as2ts) {
        as2ts = new As2Ts();
        tsMaker = new TsMaker(option);
    }

    let inputStat = fs.statSync(inputPath);
    if(inputStat.isFile()) {
        doTranslateFile(inputPath);
    } else {
        readDir(inputPath);
    }
    console.log('translation finished.');
}

function readDir(dirPath: string) {
    if(transOption && transOption.skipRule && transOption.skipRule.dirs) {
        let relativePath = path.relative(inputFolder, dirPath);
        for(let sd of transOption.skipRule.dirs) {
            if(sd.test(relativePath)) {
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
                doTranslateFile(filePath);
            }
        } else {
            readDir(filePath);
        }
    }
}

function doTranslateFile(filePath: string) {
    if(filePath.indexOf('DeviceHTML5.as')<0) return;
    let relativePath = path.relative(inputFolder, filePath);
    if(transOption && transOption.skipRule && transOption.skipRule.files) {
        for(let sf of transOption.skipRule.files) {
            if(sf.test(relativePath)) {
                return;
            }
        }
    }
    console.log('parsing: ', filePath);
    let outFilePath = filePath.replace(inputFolder, outputFolder);
    let outFilePP = path.parse(outFilePath);

    let tsContent = as2ts.translate(filePath);
    // 分析语法树
    const ast = parser.parse(tsContent, {loc: true, range: true});
    // console.log(JSON.stringify(ast));
    let relativePP = path.parse(relativePath);
    
    tsContent = tsMaker.make(ast, relativePP.dir.replace('\\', '/') + '/');

    let tsFilePath = outFilePath.replace(/\.as$/, '.ts');
    if (!fs.existsSync(outFilePP.dir)) fs.mkdirSync(outFilePP.dir, { recursive: true });
    fs.writeFileSync(tsFilePath, tsContent);
}