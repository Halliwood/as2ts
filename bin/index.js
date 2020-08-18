"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var program = require("commander");
var Main_1 = __importDefault(require("./Main"));
var myPackage = require("../package.json");
// for exmaple
// as2ts 'E:\\qhgame\\trunk\\project\\src\\' 'E:\\qhgame\\tsproj\\src\\' 'example\\rule.json'
program
    .version(myPackage.version, "-v, --version")
    .option("-s, --src <path>", "[MUST] actionscript files path. both direction or single file.")
    .option("--dist [value]", "[MUST] outout typescript file path. both direction or single file.")
    .option("-r, --rule <path>", "translate rule json file.")
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
main.translateFiles(program.src, program.dist, program.rule);
