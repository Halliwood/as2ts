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
exports.As2Ts = void 0;
var fs = __importStar(require("fs"));
var As2Ts = /** @class */ (function () {
    function As2Ts() {
    }
    As2Ts.prototype.translate = function (inAsFile) {
        var asContent = fs.readFileSync(inAsFile, 'utf-8');
        var classMatchRst = asContent.match(/class\s+(\w+)/);
        if (classMatchRst) {
            var className = classMatchRst[1];
            var ctorRe = new RegExp('(?<=function )' + className + '(?=\\()');
            asContent = asContent.replace(ctorRe, 'constructor');
        }
        asContent = asContent.replace(/public(?= class)/g, 'export');
        // 去掉package
        var pkgMatchRst = asContent.match(/^\s*package\s*[^\{]+\s*\{\s*/);
        if (pkgMatchRst) {
            asContent = asContent.substr(pkgMatchRst[0].length);
            asContent = asContent.replace(/\s*\}\s*$/, '');
        }
        // 修改import
        var iptRe = new RegExp(/\s*import\s+(\S+)\s?;/);
        var asLines = asContent.split(/[\r\n]+/);
        for (var i = 0, len = asLines.length; i < len; i++) {
            var oneLine = asLines[i];
            var iptMatchRst = oneLine.match(iptRe);
            if (iptMatchRst) {
                var iptArr = iptMatchRst[1].split('.');
                var iptName = iptArr[iptArr.length - 1];
                oneLine = 'import {' + iptName + '} from "' + iptArr.join('/') + '";';
                asLines[i] = oneLine;
            }
        }
        asContent = asLines.join('\n');
        // 修改var
        asContent = asContent.replace(/(?<=public)\s+var/g, '');
        asContent = asContent.replace(/(?<=protected)\s+var/g, '');
        asContent = asContent.replace(/(?<=private)\s+var/g, '');
        asContent = asContent.replace(/(?<=static)\s+var/g, '');
        // 去掉override关键字
        asContent = asContent.replace(/(?<=public)\s+override/g, '');
        asContent = asContent.replace(/(?<=protected)\s+override/g, '');
        asContent = asContent.replace(/(?<=private)\s+override/g, '');
        asContent = asContent.replace(/override\s+(?=public)/g, '');
        asContent = asContent.replace(/override\s+(?=protected)/g, '');
        asContent = asContent.replace(/override\s+(?=private)/g, '');
        // 去掉function关键字
        asContent = asContent.replace(/(?<=public)\s+function/g, '');
        asContent = asContent.replace(/(?<=protected)\s+function/g, '');
        asContent = asContent.replace(/(?<=private)\s+function/g, '');
        asContent = asContent.replace(/(?<=static)\s+function/g, '');
        // is改instanceof
        asContent = asContent.replace(/if\s?\((\S+)\s+is\s+(\S+)\)/g, 'if($1 instanceof $2)');
        // Vector.<xxx>改Array<xxx>
        asContent = asContent.replace(/Vector\.(?=<)/g, 'Array');
        return asContent;
    };
    return As2Ts;
}());
exports.As2Ts = As2Ts;
