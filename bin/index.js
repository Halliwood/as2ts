"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var program = require("commander");
var Main_1 = __importDefault(require("./Main"));
var myPackage = require("../package.json");
var getPath = function (val) {
    var rst = val.match(/(['"])(.+)\1/);
    if (rst)
        return rst[2];
    return val;
};
// for exmaple
// as2ts 'E:\\qhgame\\trunk\\project\\src\\' 'E:\\qhgame\\tsproj\\src\\' 'example\\rule.json'
program
    .version(myPackage.version, "-v, --version")
    .option("-s, --src <path>", "[MUST] actionscript files path. both direction or single file.", getPath)
    .option("--dist [value]", "[MUST] outout typescript file path. both direction or single file.", getPath)
    .option("-m --module", "make module.", false)
    .option("-M --no-module", "don't make module.")
    .option("-r, --rule <path>", "translate rule json file.", getPath)
    .parse(process.argv);
if (!program.src) {
    console.warn("--src option is MUST.");
    program.help();
}
if (!program.dist) {
    console.warn("--dist option is MUST.");
    program.help();
}
var main = new Main_1.default();
main.translateFiles(program.src, program.dist, program.module, program.rule);
