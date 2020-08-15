import * as fs from "fs";

export class As2Ts {
    translate(inAsFile: string): string {
        let asContent = fs.readFileSync(inAsFile, 'utf-8');
        let classMatchRst = asContent.match(/class\s+(\w+)/);
        if(classMatchRst) {
            let className = classMatchRst[1];
            let ctorRe = new RegExp('(?<=function )' + className + '(?=\\()');
            asContent = asContent.replace(ctorRe, 'constructor');
        }
        asContent = asContent.replace(/public(?= class)/g, 'export');
        // 去掉package
        let pkgMatchRst = asContent.match(/^\s*package\s*[^\{]+\s*\{\s*/);
        if(pkgMatchRst) {
            asContent = asContent.substr(pkgMatchRst[0].length);
            asContent = asContent.replace(/\s*\}\s*$/, '');
        }
        // 修改import
        let iptRe = new RegExp(/\s*import\s+(\S+)\s?;/);
        let asLines = asContent.split(/[\r\n]+/);
        for(let i = 0, len = asLines.length; i < len; i++) {
            let oneLine = asLines[i];
            let iptMatchRst = oneLine.match(iptRe);
            if(iptMatchRst) {
                let iptArr = iptMatchRst[1].split('.');
                let iptName = iptArr[iptArr.length - 1];
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
    }

}