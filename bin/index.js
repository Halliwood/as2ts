"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Main_1 = require("./Main");
var program = require("commander");
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
var main = new Main_1.as2ts.Main();
main.translateFiles(program.src, program.dist, program.rule);
