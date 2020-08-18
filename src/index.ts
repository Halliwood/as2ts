import program = require("commander");
import Main from "./Main";

var myPackage = require("../package.json");

// for exmaple
// as2ts 'E:\\qhgame\\trunk\\project\\src\\' 'E:\\qhgame\\tsproj\\src\\' 'example\\rule.json'
program
	.version(myPackage.version, "-v, --version")
	.option("-s, --src <path>", "[MUST] actionscript files path. both direction or single file.")
	.option("--dist [value]", "[MUST] outout typescript file path. both direction or single file.")
	.option("-r, --rule <path>", "translate rule json file.")	
    .parse(process.argv);

if(!(<any>program).src) {
    console.warn("--src option is MUST.");
    program.help();
}
if(!(<any>program).dist) {
    console.warn("--dist option is MUST.");
    program.help();
}

let main = new Main();
main.translateFiles((<any>program).src, (<any>program).dist, (<any>program).rule);