import { Accessibility, ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression, AssignmentPattern, AwaitExpression, BigIntLiteral, BinaryExpression, BlockStatement, BreakStatement, CallExpression, CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassProperty, ConditionalExpression, ContinueStatement, DebuggerStatement, Decorator, DoWhileStatement, EmptyStatement, ExportAllDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExpressionStatement, ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration, FunctionExpression, Identifier, IfStatement, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression, MetaProperty, MethodDefinition, NewExpression, ObjectExpression, ObjectPattern, Program, Property, RestElement, ReturnStatement, SequenceExpression, SpreadElement, Super, SwitchCase, SwitchStatement, TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression, ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration, VariableDeclarator, WhileStatement, WithStatement, YieldExpression, TSEnumDeclaration, BindingName, TSAsExpression, TSClassImplements, TSInterfaceDeclaration, TSTypeAssertion, TSModuleDeclaration, TSModuleBlock, TSDeclareFunction, TSAbstractMethodDefinition, TSInterfaceBody, TSMethodSignature, TSParenthesizedType, TSTypeAnnotation, TSTypeParameterInstantiation, TSTypeReference, TSVoidKeyword, BaseNode } from '@typescript-eslint/types/dist/ts-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { As2TsOption, FromModule } from '../../typings';
import util = require('util');
import path = require('path');
import {TsAnalysor, ClassInfo, FunctionInfo, PropertyInfo} from './TsAnalysor';
import { As2TsHints } from './Strings';

export class TsMaker {
    private readonly TagAddImport = '[as2ts_import]';
    
    // 运算符优先级
    private pv = 0;
    private readonly operatorPriorityMap: {[key: string]: number} = {};

    // 选项
    private option: As2TsOption;
    private analysor: TsAnalysor;
    private readonly simpleTypes: string[] = ['number', 'string', 'boolean', 'any', 'Array', '[]', 'Object', 'void'];
    private readonly parentNoThis = [AST_NODE_TYPES.Property, AST_NODE_TYPES.VariableDeclarator];
    private readonly noSemecolonTypes = [AST_NODE_TYPES.WhileStatement, AST_NODE_TYPES.DoWhileStatement, AST_NODE_TYPES.ForInStatement, AST_NODE_TYPES.ForOfStatement, 
        AST_NODE_TYPES.ForStatement, AST_NODE_TYPES.IfStatement, AST_NODE_TYPES.SwitchStatement];

    private inputFolder: string;
    private filePath: string;
    private dirname: string;
    private relativePath: string;
    private crtClass: ClassInfo;
    private crtFunc: FunctionInfo;

    private importedMap: {[key: string]: boolean};
    private allTypes: string[];
    private startAddThis: boolean;
    private useModuleMap: {[id: string]: string};
    private extraImports: FromModule[];

    constructor(analysor: TsAnalysor, option: As2TsOption) {
        this.analysor = analysor;
        this.option = option || {};

        this.setPriority(['( … )'], this.pv++);
        this.setPriority(['… . …', '… [ … ]', 'new … ( … )', '… ( … )'], this.pv++);
        this.setPriority(['new …'], this.pv++);
        this.setPriority(['… ++', '… --'], this.pv++);
        this.setPriority(['! …', '~ …', '+ …', '- …', '++ …', '-- …', 'typeof …', 'void …', 'delete …', 'await …'], this.pv++);
        this.setPriority(['… ** …'], this.pv++);
        this.setPriority(['… * …', '… / …', '… % …'], this.pv++);
        this.setPriority(['… + …', '… - …'], this.pv++);
        this.setPriority(['… << …', '… >> …', '… >>> …'], this.pv++);
        this.setPriority(['… < …', '… <= …', '… > …', '… >= …', '… in …', '… instanceof …'], this.pv++);
        this.setPriority(['… == …', '… != …', '… === …', '… !== …'], this.pv++);
        this.setPriority(['… & …'], this.pv++);
        this.setPriority(['… ^ …'], this.pv++);
        this.setPriority(['… | …'], this.pv++);
        this.setPriority(['… && …'], this.pv++);
        this.setPriority(['… || …'], this.pv++);
        this.setPriority(['… ? … : …'], this.pv++);
        this.setPriority(['… = …', '… += …', '… -= …', '… *= …', '… /= …', '… %= …', '… <<= …', '… >>= …', '… >>>= …', '… &= …', '… ^= …', '… |= …'], this.pv++);
        this.setPriority(['yield …', 'yield* …'], this.pv++);
        this.setPriority(['...'], this.pv++);
        this.setPriority(['… , …'], this.pv++);
    }
        
    private setPriority(keys: string[], value: number) {
        for(let i = 0, len = keys.length; i < len; i++) {
            this.operatorPriorityMap[keys[i]] = value;
        }
    }
  
    private getPriority(raw: string) {
        let idx = this.operatorPriorityMap[raw];
        if (idx < 0) {
            idx = 999;
            console.error('no prioritys: ' + raw);
        }
        return idx;
    }

    private calPriority(ast: any) {
        if ('__calPriority' in ast) {
            return ast.__calPriority;
        }
        switch (ast.type) {
            case AST_NODE_TYPES.UnaryExpression:
                {
                    let ue = ast as UnaryExpression;
                    ast.__calPriority = this.getPriority(ue.prefix ? ue.operator + ' …' : '… ' + ue.operator);
                }
                break;

            case AST_NODE_TYPES.UpdateExpression:
                {
                    let ue = ast as UpdateExpression;
                    ast.__calPriority = this.getPriority(ue.prefix ? ue.operator + ' …' : '… ' + ue.operator);
                }
                break;

            case AST_NODE_TYPES.BinaryExpression:
                {
                    let be = ast as BinaryExpression;
                    ast.__calPriority = this.getPriority('… ' + be.operator + ' …');
                }
                break;

            case AST_NODE_TYPES.AssignmentExpression:
                {
                    let ae = ast as AssignmentExpression;
                    ast.__calPriority = this.getPriority('… ' + ae.operator + ' …');
                }
                break;

            case AST_NODE_TYPES.LogicalExpression:
                {
                    let le = ast as LogicalExpression;
                    ast.__calPriority = this.getPriority('… ' + le.operator + ' …');
                }
                break;

            case AST_NODE_TYPES.MemberExpression:
                {
                    let me = ast as MemberExpression;
                    ast.__calPriority = this.getPriority(me.computed ? '… [ … ]' : '… . …');
                }
                break;

            case AST_NODE_TYPES.ConditionalExpression:
                {
                    ast.__calPriority = this.getPriority('… ? … : …');
                }
                break;

            case AST_NODE_TYPES.CallExpression:
                {
                    ast.__calPriority = this.getPriority('… ( … )');
                }
                break;

            case AST_NODE_TYPES.NewExpression:
                {
                    let ne = ast as NewExpression;
                    if (ne.arguments.length > 0) {
                        ast.__calPriority = this.getPriority('new … ( … )');
                    } else {
                        ast.__calPriority = this.getPriority('new …');
                    }
                }
                break;

            case AST_NODE_TYPES.SequenceExpression:
                {
                    ast.__calPriority = this.getPriority('… , …');
                }
                break;
        }
        return ast.__calPriority;
    }

    make(ast: any, inputFolder: string, filePath: string): string {
        this.allTypes = [];
        this.importedMap = {};
        this.useModuleMap = {};
        this.extraImports = [];
        this.inputFolder = inputFolder;
        this.filePath = filePath;
        this.dirname = path.dirname(filePath);
        this.relativePath = path.relative(inputFolder, filePath);
        let str = this.codeFromAST(ast);

        let importStr = '';
        for(let i = 0, len = this.allTypes.length; i < len; i++) {
            let type = this.allTypes[i];
            if(!this.importedMap[type] && !this.isSimpleType(type)) {
                let classInfo = this.analysor.classMap[type];
                if(classInfo && !classInfo.declare) {
                    if(this.option.noModule) {
                        let mstr = path.relative(this.dirname, path.join(inputFolder, classInfo.module.replace(/\.+/g, path.sep))).replace(/\\+/g, '/');
                        if(!mstr) {
                            mstr = '.';
                        }
                        else if(mstr.charAt(0) != '.') {
                            mstr = './' + mstr;
                        }
                        importStr += 'import {' + type + '} from "' + mstr + '/' + type + '";\n';
                    } else {
                        let mstr = classInfo.module.replace(/\//g, '.');
                        if(mstr.charAt(mstr.length - 1) != '.') {
                            mstr += '.';
                        }
                        importStr += 'import ' + type + ' = ' + mstr + type + ';\n';
                    }
                }              
            } 
        }
        for(let i = 0, len = this.extraImports.length; i < len; i++) {
            let ei = this.extraImports[i];
            if(this.option.noModule) {
                let mstr = path.relative(this.dirname, path.join(inputFolder, ei.import)).replace(/\\+/g, '/');
                if(!mstr) {
                    mstr = '.';
                }
                else if(mstr.charAt(0) != '.') {
                    mstr = './' + mstr;
                }
                importStr += 'import {' + ei.module + '} from "' + mstr + '";\n';
            } else {
                let mstr = ei.import.replace(/\//g, '.');
                importStr += 'import ' + ei.module + ' = ' + mstr + ';\n';
            }
        }
        if(importStr && !this.option.noModule) {
            importStr = this.indent(importStr);
        }
        str = str.replace(this.TagAddImport, importStr);
        str = str.replace(new RegExp('import \\{\\w+\\} from "' + path.basename(this.filePath, '.ts') + '";'), '');
        let fileBasename = path.basename(this.filePath, '.as');
        str = str.replace('import \{' + fileBasename + '\} from "./' + fileBasename + '";', '');
        return str;
    }

    // private processAST(ast: any) {
    //     switch (ast.type) {
    //         case AST_NODE_TYPES.ClassDeclaration:
    //             this.processClassDeclaration(ast as ClassDeclaration);
    //             break;
    //         case AST_NODE_TYPES.TSEnumDeclaration:
    //             this.processTSEnumDeclaration(ast as TSEnumDeclaration);
    //             break;
    //         case AST_NODE_TYPES.ExportNamedDeclaration:
    //             this.processExportNamedDeclaration(ast as ExportNamedDeclaration);
    //             break;
    //         case AST_NODE_TYPES.TSModuleBlock:
    //             this.processTSModuleBlock(ast as TSModuleBlock);
    //             break;
    //         case AST_NODE_TYPES.TSModuleDeclaration:
    //             this.processTSModuleDeclaration(ast as TSModuleDeclaration);
    //             break;
    //         default:
    //             break;
    //     }
    // }

    // private processClassDeclaration(ast: ClassDeclaration) {
    // }

    private codeFromAST(ast: any): string {
        let str = '';
        switch (ast.type) {

            case AST_NODE_TYPES.ArrayExpression:
                str += this.codeFromArrayExpression(ast);
                break;

            case AST_NODE_TYPES.ArrayPattern:
                str += this.codeFromArrayPattern(ast);
                break;

            case AST_NODE_TYPES.ArrowFunctionExpression:
                str += this.codeFromArrowFunctionExpression(ast);
                break;

            case AST_NODE_TYPES.AssignmentExpression:
                str += this.codeFromAssignmentExpression(ast);
                break;

            case AST_NODE_TYPES.AssignmentPattern:
                str += this.codeFromAssignmentPattern(ast);
                break;

            case AST_NODE_TYPES.AwaitExpression:
                str += this.codeFromAwaitExpression(ast);
                break;

            // case AST_NODE_TYPES.BigIntLiteral:
            //     str += this.codeFromBigIntLiteral(ast);
            //     break;

            case AST_NODE_TYPES.BinaryExpression:
                str += this.codeFromBinaryExpression(ast);
                break;

            case AST_NODE_TYPES.BlockStatement:
                str += this.codeFromBlockStatement(ast);
                break;

            case AST_NODE_TYPES.BreakStatement:
                str += this.codeFromBreakStatement(ast);
                break;

            case AST_NODE_TYPES.CallExpression:
                str += this.codeFromCallExpression(ast);
                break;

            case AST_NODE_TYPES.CatchClause:
                str += this.codeFromCatchClause(ast);
                break;

            case AST_NODE_TYPES.ClassBody:
                str += this.codeFromClassBody(ast);
                break;

            case AST_NODE_TYPES.ClassDeclaration:
                str += this.codeFromClassDeclaration(ast);
                break;

            case AST_NODE_TYPES.ClassExpression:
                str += this.codeFromClassExpression(ast);
                break;

            case AST_NODE_TYPES.ClassProperty:
                str += this.codeFromClassProperty(ast);
                break;

            case AST_NODE_TYPES.ConditionalExpression:
                str += this.codeFromConditionalExpression(ast);
                break;

            case AST_NODE_TYPES.ContinueStatement:
                str += this.codeFromContinueStatement(ast);
                break;

            case AST_NODE_TYPES.DebuggerStatement:
                str += this.codeFromDebuggerStatement(ast);
                break;

            case AST_NODE_TYPES.Decorator:
                str += this.codeFromDecorator(ast);
                break;

            case AST_NODE_TYPES.DoWhileStatement:
                str += this.codeFromDoWhileStatement(ast);
                break;

            case AST_NODE_TYPES.EmptyStatement:
                str += this.codeFromEmptyStatement(ast);
                break;

            case AST_NODE_TYPES.ExportAllDeclaration:
                str += this.codeFromExportAllDeclaration(ast);
                break;

            case AST_NODE_TYPES.ExportDefaultDeclaration:
                str += this.codeFromExportDefaultDeclaration(ast);
                break;

            case AST_NODE_TYPES.ExportNamedDeclaration:
                str += this.codeFromExportNamedDeclaration(ast);
                break;

            case AST_NODE_TYPES.ExportSpecifier:
                str += this.codeFromExportSpecifier(ast);
                break;

            case AST_NODE_TYPES.ExpressionStatement:
                str += this.codeFromExpressionStatement(ast);
                break;

            case AST_NODE_TYPES.ForInStatement:
                str += this.codeFromForInStatement(ast);
                break;

            case AST_NODE_TYPES.ForOfStatement:
                str += this.codeFromForOfStatement(ast);
                break;

            case AST_NODE_TYPES.ForStatement:
                str += this.codeFromForStatement(ast);
                break;

            case AST_NODE_TYPES.FunctionDeclaration:
                str += this.codeFromFunctionDeclaration(ast);
                break;

            case AST_NODE_TYPES.FunctionExpression:
                str += this.codeFromFunctionExpression(ast);
                break;

            case AST_NODE_TYPES.Identifier:
                str += this.codeFromIdentifier(ast);
                break;

            case AST_NODE_TYPES.IfStatement:
                str += this.codeFromIfStatement(ast);
                break;

            case AST_NODE_TYPES.ImportDeclaration:
                str += this.codeFromImportDeclaration(ast);
                break;

            case AST_NODE_TYPES.ImportDefaultSpecifier:
                str += this.codeFromImportDefaultSpecifier(ast);
                break;

            case AST_NODE_TYPES.ImportNamespaceSpecifier:
                str += this.codeFromImportNamespaceSpecifier(ast);
                break;

            case AST_NODE_TYPES.ImportSpecifier:
                str += this.codeFromImportSpecifier(ast);
                break;

            case AST_NODE_TYPES.LabeledStatement:
                str += this.codeFromLabeledStatement(ast);
                break;

            case AST_NODE_TYPES.Literal:
                str += this.codeFromLiteral(ast);
                break;

            case AST_NODE_TYPES.LogicalExpression:
                str += this.codeFromLogicalExpression(ast);
                break;

            case AST_NODE_TYPES.MemberExpression:
                str += this.codeFromMemberExpression(ast);
                break;

            case AST_NODE_TYPES.MetaProperty:
                str += this.codeFromMetaProperty(ast);
                break;

            case AST_NODE_TYPES.MethodDefinition:
                str += this.codeFromMethodDefinition(ast);
                break;

            case AST_NODE_TYPES.NewExpression:
                str += this.codeFromNewExpression(ast);
                break;

            case AST_NODE_TYPES.ObjectExpression:
                str += this.codeFromObjectExpression(ast);
                break;

            case AST_NODE_TYPES.ObjectPattern:
                str += this.codeFromObjectPattern(ast);
                break;

            case AST_NODE_TYPES.Program:
                str += this.codeFromProgram(ast);
                break;

            case AST_NODE_TYPES.Property:
                str += this.codeFromProperty(ast);
                break;

            case AST_NODE_TYPES.RestElement:
                str += this.codeFromRestElement(ast);
                break;

            case AST_NODE_TYPES.ReturnStatement:
                str += this.codeFromReturnStatement(ast);
                break;

            case AST_NODE_TYPES.SequenceExpression:
                str += this.codeFromSequenceExpression(ast);
                break;

            case AST_NODE_TYPES.SpreadElement:
                str += this.codeFromSpreadElement(ast);
                break;

            case AST_NODE_TYPES.Super:
                str += this.codeFromSuper(ast);
                break;

            case AST_NODE_TYPES.SwitchCase:
                str += this.codeFromSwitchCase(ast);
                break;

            case AST_NODE_TYPES.SwitchStatement:
                str += this.codeFromSwitchStatement(ast);
                break;

            case AST_NODE_TYPES.TaggedTemplateExpression:
                str += this.codeFromTaggedTemplateExpression(ast);
                break;

            case AST_NODE_TYPES.TemplateElement:
                str += this.codeFromTemplateElement(ast);
                break;

            case AST_NODE_TYPES.TemplateLiteral:
                str += this.codeFromTemplateLiteral(ast);
                break;

            case AST_NODE_TYPES.ThisExpression:
                str += this.codeFromThisExpression(ast);
                break;

            case AST_NODE_TYPES.ThrowStatement:
                str += this.codeFromThrowStatement(ast);
                break;

            case AST_NODE_TYPES.TryStatement:
                str += this.codeFromTryStatement(ast);
                break;

            case AST_NODE_TYPES.TSClassImplements:
                str += this.codeFromTSClassImplements(ast);
                break;

            case AST_NODE_TYPES.TSParenthesizedType:
                str += this.codeFromTSParenthesizedType(ast);
                break;

            case AST_NODE_TYPES.UnaryExpression:
                str += this.codeFromUnaryExpression(ast);
                break;

            case AST_NODE_TYPES.UpdateExpression:
                str += this.codeFromUpdateExpression(ast);
                break;

            case AST_NODE_TYPES.VariableDeclaration:
                str += this.codeFromVariableDeclaration(ast);
                break;

            case AST_NODE_TYPES.VariableDeclarator:
                str += this.codeFromVariableDeclarator(ast);
                break;

            case AST_NODE_TYPES.WhileStatement:
                str += this.codeFromWhileStatement(ast);
                break;

            case AST_NODE_TYPES.WithStatement:
                str += this.codeFromWithStatement(ast);
                break;

            case AST_NODE_TYPES.YieldExpression:
                str += this.codeFromYieldExpression(ast);
                break;

            case AST_NODE_TYPES.TSAbstractMethodDefinition:
                str += this.codeFromTSAbstractMethodDefinition(ast);
                break;

            case AST_NODE_TYPES.TSAsExpression:
                str += this.codeFromTSAsExpression(ast);
                break;

            case AST_NODE_TYPES.TSDeclareFunction:
                str += this.codeFromTSDeclareFunction(ast);
                break;

            case AST_NODE_TYPES.TSEnumDeclaration:
                str += this.codeFromTSEnumDeclaration(ast);
                break;

            case AST_NODE_TYPES.TSInterfaceBody:
                str += this.codeFromTSInterfaceBody(ast);
                break;

            case AST_NODE_TYPES.TSMethodSignature:
                str += this.codeFromTSMethodSignature(ast);
                break;

            case AST_NODE_TYPES.TSModuleBlock:
                str += this.codeFromTSModuleBlock(ast);
                break;

            case AST_NODE_TYPES.TSModuleDeclaration:
                str += this.codeFromTSModuleDeclaration(ast);
                break;

            case AST_NODE_TYPES.TSInterfaceDeclaration:
                str += this.codeFromTSInterfaceDeclaration(ast);
                break;

            case AST_NODE_TYPES.TSTypeAssertion:
                str += this.codeFromTSTypeAssertion(ast);
                break;

            case AST_NODE_TYPES.TSTypeAnnotation:
                str += this.codeFromTSTypeAnnotation(ast);
                break;

            case AST_NODE_TYPES.TSTypeParameterInstantiation:
                str += this.codeFromTSTypeParameterInstantiation(ast);
                break;

            case AST_NODE_TYPES.TSTypeReference:
                str += this.codeFromTSTypeReference(ast);
                break;
            
            case AST_NODE_TYPES.TSVoidKeyword:
                str += this.codeFromTSVoidKeyword(ast);
                break;

            case 'TSJSDocAllType':
                str += 'any';
                break;

            default:
                console.log(util.inspect(ast, true, 3));
                throw new Error('unrecornized type: ' + ast.type);
                break;
        }
        return str;
    }

    private codeFromArrayExpression(ast: ArrayExpression): string {
        let str = '';
        for (let i = 0, len = ast.elements.length; i < len; i++) {
            if (str) {
                str += ', ';
            }
            str += this.codeFromAST(ast.elements[i]);
        }
        return '[' + str + ']';
    }

    private codeFromArrayPattern(ast: ArrayPattern): string {
        this.assert(false, ast, 'Not support ArrayPattern yet!');
        return '';
    }

    private codeFromArrowFunctionExpression(ast: ArrowFunctionExpression): string {
        let str = '(';
        if (ast.params) {
            for (let i = 0, len = ast.params.length; i < len; i++) {
                if (i > 0) {
                    str += ', ';
                }
                let oneParam = ast.params[i];
                (oneParam as any).__parent = ast;
                str += this.codeFromAST(oneParam);
            }
        }
        str += ')\n';
        if (ast.body) {
            let bodyStr = this.codeFromAST(ast.body);
            str += this.indent(bodyStr) + '\n';
        }
        this.assert(!ast.generator, ast, 'Not support generator yet!');
        this.assert(!ast.async, ast, 'Not support async yet!');
        this.assert(!ast.expression, ast, 'Not support expression yet!');
        str += 'end\n';
        return str;
    }

    private codeFromAssignmentExpression(ast: AssignmentExpression): string {
        return this.codeFromBinaryExpression(ast as any);
    }

    private codeFromAssignmentPattern(ast: AssignmentPattern): string {
        let str = this.codeFromAST(ast.left);
        str += ' = ' + this.codeFromAST(ast.right);
        return str;
    }

    private codeFromAwaitExpression(ast: AwaitExpression): string {
        this.assert(false, ast, 'Not support AwaitExpression yet!');
        return '';
    }

    private codeFromBinaryExpression(ast: BinaryExpression): string {
        let optStr = ast.operator;
        this.assert('>>>=' != optStr, ast, 'Not support >>>= yet!');
        (ast.left as any).__parent = ast;
        (ast.right as any).__parent = ast;
        let left = this.codeFromAST(ast.left);
        if (this.calPriority(ast.left) > this.calPriority(ast)) {
            left = '(' + left + ')';
        }
        let right = this.codeFromAST(ast.right);
        if (this.calPriority(ast.right) >= this.calPriority(ast)) {
            right = '(' + right + ')';
        }

        // if (optStr == 'in') {
        //     return right + '[' + left + ']';
        // }

        return left + ' ' + optStr + ' ' + right;
    }

    private codeFromBlockStatement(ast: BlockStatement): string {
        let str = '';
        for (let i = 0, len = ast.body.length; i < len; i++) {
            let bodyEle = ast.body[i];
            let bstr = this.codeFromAST(bodyEle);
            if (bstr) {
                if (i > 0) {
                    str += '\n';
                }
                str += bstr;
                if(this.noSemecolonTypes.indexOf(bodyEle.type) < 0) {
                    str += ';';
                }
            }
        }
        return str;
    }

    private codeFromBreakStatement(ast: BreakStatement): string {
        return 'break;';
    }

    private codeFromCallExpression(ast: CallExpression): string {
        // 没有基类的去掉super
        if(ast.callee.type == AST_NODE_TYPES.Super && this.crtClass && !this.crtClass.superClass) return '';
        (ast.callee as any).__parent = ast;
        let calleeStr = this.codeFromAST(ast.callee);
        if(this.option.methordMapper && this.option.methordMapper[calleeStr]) {
            calleeStr = this.option.methordMapper[calleeStr];
        }
        if(this.calPriority(ast.callee) > this.calPriority(ast)) {
            calleeStr = '(' + calleeStr + ')';
        }
        let str = '';
        let allAgmStr = '';
        for (let i = 0, len = ast.arguments.length; i < len; i++) {
            let arg = ast.arguments[i];
            let argStr = this.codeFromAST(arg);
            if (allAgmStr) {
                allAgmStr += ', ';
            }
            allAgmStr += argStr;
        }
        if(calleeStr == '__JS__') {
            str = allAgmStr.substr(1, allAgmStr.length - 2);
        } else {
            str = calleeStr + '(' + allAgmStr + ')';
        }
        return str;
    }

    private codeFromCatchClause(ast: CatchClause): string {
        let str = 'catch(';
        (ast.param as any).__parent = ast;
        str += this.codeFromAST(ast.param);
        str += ') {\n'
        str += this.indent(this.codeFromBlockStatement(ast.body));
        str += '\n}'
        return str;
    }

    private codeFromClassBody(ast: ClassBody): string {
        let str = '';
        for (let i = 0, len = ast.body.length; i < len; i++) {
            let cbodyStr = this.codeFromAST(ast.body[i]);
            if (cbodyStr) {
                if (i > 0) {
                    str += '\n';
                }
                str += cbodyStr;
            }
        }
        return str;
    }

    private codeFromClassDeclaration(ast: ClassDeclaration): string {
        if (ast.typeParameters) {
            // typeParameters?: TSTypeParameterDeclaration;
        }
        if (ast.superTypeParameters) {
            // TSTypeParameterInstantiation;
        }
        if (!ast.id) {
            this.assert(false, ast, 'Class name is necessary!');
        }
        let className = this.codeFromAST(ast.id);
        this.importedMap[className] = true;
        this.crtClass = this.analysor.classMap[className];
        this.assert(null != this.crtClass, ast, '[ERROR]Cannot find class info: ' + className);

        let str = '';
        if((ast as any).__exported) {
            str += 'export ';
        }
        str += 'class ' + className + ' ';

        if (ast.superClass) {
            (ast.superClass as any).__isType = true;
            str += 'extends ' + this.codeFromAST(ast.superClass) + ' ';
        }
        if(ast.implements) {
            str += 'implements ';
            for(let i = 0, len = ast.implements.length; i < len; i++) {
                if(i > 0) {
                    str += ', ';
                }
                (ast.implements[i] as any).__isType = true;
                str += this.codeFromAST(ast.implements[i]);
            }
            str += ' ';
        }
        // if(ast.abstract) {
        //   // boolean;
        // }
        if (ast.declare) {
            // boolean
            this.assert(false, ast);
        }
        if (ast.decorators) {
            // Decorator[];
            this.assert(false, ast);
        }
        str += '{\n';
        str += this.indent(this.codeFromClassBody(ast.body));
        str += '\n}';
        this.crtClass = null;
        return str;
    }

    private codeFromClassExpression(ast: ClassExpression): string {
        // this.pintHit(ast);
        return this.codeFromClassDeclaration(ast as any);
    }

    private codeFromClassProperty(ast: ClassProperty): string {
        this.assert(!ast.decorators, ast, 'not support decorators yet!');
        this.assert(!ast.optional, ast, 'not support optional yet!');
        this.assert(!ast.computed, ast, 'not support computed yet!');
        this.assert(!ast.definite, ast, 'not support definite yet!');
        this.assert(!ast.declare, ast, 'not support declare yet!');
        let str = '';
        if(ast.accessibility) {
            str += ast.accessibility + ' ';
        }
        if(ast.static) {
            str += 'static ';
        }
        if(ast.readonly) {
            str += 'readonly ';
        }
        let propertyName = this.codeFromAST(ast.key);
        str += propertyName;
        if(ast.typeAnnotation) {
            str += ': ' + this.codeFromAST(ast.typeAnnotation);
        }
        if (ast.value) {
            str += ' = ' + this.codeFromAST(ast.value);
        }
        str += ';';

        return str;
    }

    private codeFromConditionalExpression(ast: ConditionalExpression): string {
        let testStr = this.codeFromAST(ast.test);
        if(this.calPriority(ast.test) >= this.calPriority(ast)) {
            testStr = '(' + testStr + ')';
        }
        let consequantStr = this.codeFromAST(ast.consequent);
        if(this.calPriority(ast.consequent) >= this.calPriority(ast)) {
            consequantStr = '(' + consequantStr + ')';
        }
        let alternateStr = this.codeFromAST(ast.alternate);
        if(this.calPriority(ast.alternate) >= this.calPriority(ast)) {
            alternateStr = '(' + alternateStr + ')';
        }
        let str = testStr + ' ? ' + consequantStr + ' : ' + alternateStr;
        return str;
    }

    private codeFromContinueStatement(ast: ContinueStatement): string {
        return 'continue;';
    }

    private codeFromDebuggerStatement(ast: DebuggerStatement): string {
        this.assert(false, ast, 'Not support DebuggerStatement yet!');
        return '';
    }

    private codeFromDecorator(ast: Decorator): string {
        this.assert(false, ast, 'Not support Decorator yet!');
        return '';
    }

    private codeFromDoWhileStatement(ast: DoWhileStatement): string {
        this.assert(false, ast, 'Not support DoWhileStatement yet!');
        return '';
    }

    private codeFromEmptyStatement(ast: EmptyStatement): string {
        return '';
    }

    private codeFromExportAllDeclaration(ast: ExportAllDeclaration): string {
        this.assert(false, ast, 'Not support ExportAllDeclaration yet!');
        return '';
    }

    private codeFromExportDefaultDeclaration(ast: ExportDefaultDeclaration): string {
        return '';
    }

    private codeFromExportNamedDeclaration(ast: ExportNamedDeclaration): string {
        (ast.declaration as any).__exported = true;
        if ((ast as any).__module) {
            (ast.declaration as any).__module = (ast as any).__module;
        }
        return this.codeFromAST(ast.declaration);
    }

    private codeFromExportSpecifier(ast: ExportSpecifier): string {
        this.assert(false, ast, 'Not support ExportSpecifier yet!');
        return '';
    }

    private codeFromExpressionStatement(ast: ExpressionStatement): string {
        return this.codeFromAST(ast.expression);
    }

    private codeFromForInStatement(ast: ForInStatement): string {
        (ast.left as any).__parent = ast;
        let str = 'for(' + this.codeFromAST(ast.left) + ' in ' + this.codeFromAST(ast.right) + ') {\n';
        str += this.indent(this.codeFromAST(ast.body)) + '\n';
        str += '}';
        return str;
    }

    private codeFromForOfStatement(ast: ForOfStatement): string {
        (ast.left as any).__parent = ast;
        let str = 'for(' + this.codeFromAST(ast.left) + ' of ' + this.codeFromAST(ast.right) + ') {\n';
        str += this.indent(this.codeFromAST(ast.body)) + '\n';
        str += '}';
        return str;
    }

    private codeFromForStatement(ast: ForStatement): string {
        let str = 'for(';
        if (ast.init) {
            str += this.codeFromAST(ast.init);
        } 
        if(str.charAt(str.length - 1) != ';') {
            str += '; ';
        }
        if (ast.test) {
            str += this.codeFromAST(ast.test);
        } 
        str += '; ';
        if (ast.update) {
            str += this.codeFromAST(ast.update);
        } 
        str += ') {\n';
        let repeatBodyStr = this.codeFromAST(ast.body);
        str += this.indent(repeatBodyStr) + '\n';
        str += '}';
        return str;
    }

    private codeFromFunctionDeclaration(ast: FunctionDeclaration): string {
        return this.codeFromFunctionExpression(ast as any);
    }

    private codeFromFunctionExpression(ast: FunctionExpression): string {
        return this.codeFromFunctionExpressionInternal(null, false, null, null, ast);
    }

    private codeFromFunctionExpressionInternal(funcName: string, isStatic: boolean, kind: string, accessibility: Accessibility, ast: FunctionExpression): string {
        let str = '';
        if (!funcName && ast.id) {
            funcName = this.codeFromAST(ast.id);
        }
        if(!funcName) {
            funcName = 'function';
        }
        if(accessibility) {
            str += accessibility + ' ';
        }
        if(isStatic) {
            str += 'static ';
        }
        if (kind == 'get' || kind == 'set') {
            str += kind + ' ';
        } 

        if(this.crtClass) {
            if(funcName == this.crtClass.name) funcName = 'constructor';
            if(this.crtFunc) {
                // 这是一个匿名函数
                this.crtFunc.anoymousFuncCnt++;
                let internalFuncName = this.crtFunc.name + '~' + this.crtFunc.anoymousFuncCnt;
                let funcInfo = this.crtClass.functionMap[internalFuncName];
                this.assert(null != funcInfo, ast, 'Could not find function info: ' + internalFuncName);
                funcInfo.anoymousFuncCnt = 0;
                funcInfo.parentFunc = this.crtFunc;
                this.crtFunc = funcInfo;
            }
            else {
                let funcInfo = this.crtClass.functionMap[funcName];
                this.assert(null != funcInfo, ast, 'Could not find function info: ' + funcName);
                funcInfo.anoymousFuncCnt = 0;
                funcInfo.parentFunc = null;
                this.crtFunc = funcInfo;
            }
        }
        str += funcName + '(';
        if (ast.params) {
            for (let i = 0, len = ast.params.length; i < len; i++) {
                if (i > 0) {
                    str += ', ';
                }
                let oneParam = ast.params[i];
                (oneParam as any).__parent = ast;
                (oneParam as any).__isFuncParam = true;
                str += this.codeFromAST(oneParam);
            }
        }
        str += ')';
        if(ast.returnType && kind != 'set' && funcName != 'constructor') {
            str += ': ' + this.codeFromAST(ast.returnType);
        }
        str += ' {\n';

        if (ast.body) {
            if(!this.crtFunc.parentFunc) {
                this.startAddThis = true;
            }
            let bodyStr = this.codeFromAST(ast.body);
            // 构造函数加上super
            if('constructor' == funcName && this.crtClass.superClass && bodyStr.indexOf('super(') < 0) {
                if(bodyStr) {
                    bodyStr = 'super();\n' + bodyStr;
                } else {
                    bodyStr = 'super();';
                }
            }
            if(!this.crtFunc.parentFunc) {
                this.startAddThis = false;
            }
            str += this.indent(bodyStr);
        }
        str += '\n}'
        this.assert(!ast.generator, ast, 'Not support generator yet!');
        this.assert(!ast.async, ast, 'Not support async yet!');
        this.assert(!ast.expression, ast, 'Not support expression yet!');
        this.assert(!ast.declare, ast, 'Not support declare yet!');
        this.crtFunc = this.crtFunc.parentFunc;
        return str;
    }

    private codeFromIdentifier(ast: Identifier): string {
        let str = ast.name;
        if(this.startAddThis && null != this.crtClass && null != this.crtFunc) {
            if((ast as any).__parent && (ast as any).__parent.type == AST_NODE_TYPES.VariableDeclarator) { 
                this.crtFunc.localVars.push(str);
            }
            else if(str != this.crtClass.name && (!(ast as any).__parent || this.parentNoThis.indexOf((ast as any).__parent.type) < 0 && ((ast as any).__parent.type != AST_NODE_TYPES.MemberExpression || (ast as any).__memberExp_is_object || (ast as any).__memberExp_is_computed_property)) && 
            this.crtFunc.params.indexOf(str) < 0 && this.crtFunc.localVars.indexOf(str) < 0) {
                let minfo = this.getMemberInfo(this.crtClass, str);
                if(minfo) {
                    if(minfo.static) {
                        str = minfo.className + '.' + str;
                    } else {
                        str = 'this.' + str;
                    }
                } else if(this.analysor.classMap[str]) {
                    let mapped = this.option.typeMapper[str];
                    if(mapped) str = mapped;
                    if(this.allTypes.indexOf(str) < 0) {
                        this.allTypes.push(str);
                    }
                } 
            } 
        } 
        if(ast.typeAnnotation) {
            if(!(ast as any).__parent || ((ast as any).__parent.type != AST_NODE_TYPES.CatchClause && (!(ast as any).__parent.__parent || !(ast as any).__parent.__parent.__parent || AST_NODE_TYPES.ForInStatement != (ast as any).__parent.__parent.__parent.type))) {
                str += ': ' + this.codeFromAST(ast.typeAnnotation);
            }
        } else if((ast as any).__isType) {
            let mapped = this.option.typeMapper[str];
            if(mapped) str = mapped;
            if(this.allTypes.indexOf(str) < 0) {
                this.allTypes.push(str);
            }
        }
        if(typeof(this.useModuleMap[str]) == 'string') {
            str = this.useModuleMap[str];
        }
        if(this.option.idReplacement && typeof(this.option.idReplacement[str]) === 'string') {
            str = this.option.idReplacement[str];
        }
        return str;
    }

    private codeFromIfStatement(ast: IfStatement): string {
        let testStr = this.codeFromAST(ast.test);
        let str = 'if(' + testStr + ' ) {\n';
        str += this.indent(this.codeFromAST(ast.consequent));
        str += '\n} ';
        if (ast.alternate && (ast.alternate.type != AST_NODE_TYPES.BlockStatement || (ast.alternate as BlockStatement).body.length > 0)) {
            str += 'else ';
            let altStr = this.codeFromAST(ast.alternate);
            if (ast.alternate.type != AST_NODE_TYPES.IfStatement) {
                str += '{\n';
                str += this.indent(altStr);
                str += '\n}';
            } else {
                str += altStr;
            }
        } 
        return str;
    }

    private codeFromImportDeclaration(ast: ImportDeclaration): string {
        let str = 'import ';
        let specifierStr = '';
        let cnt = 0;
        for(let i = 0, len = ast.specifiers.length; i < len; i++) {
            let ss = this.codeFromAST(ast.specifiers[i]);
            if(this.importedMap[ss]) continue;
            if(cnt > 0) {
                specifierStr += ', ';
            }
            specifierStr += ss;
            this.importedMap[ss] = true;
            cnt++;
        }
        if(cnt == 0) return '';

        let sourceStr: string;
        let sourceValue = ast.source.value as string;
        let asModuleFormular: FromModule;
        if(this.option.importRule && this.option.importRule.fromModule) {
            // 需要以模块形式导入
            for(let fm of this.option.importRule.fromModule) {
                if(new RegExp(fm.regular).test(sourceValue)) {
                    asModuleFormular = fm;
                    break;
                }
            }
        }
        let dotPos = sourceValue.lastIndexOf('/');
        let idStr = sourceValue;
        if(dotPos > 0) {
            idStr = sourceValue.substr(dotPos + 1);
        }
        if(this.option.idReplacement && typeof(this.option.idReplacement[idStr]) === 'string') {
            idStr = this.option.idReplacement[idStr];
            if(dotPos > 0) {
                let preIdStr = sourceValue.substring(0, dotPos);
                sourceValue = preIdStr + '/' + idStr;
            }
        }
        if(asModuleFormular) {
            // console.log('%s -> %s', specifierStr, asModuleFormular.module + '.' + idStr);
            this.useModuleMap[specifierStr] = asModuleFormular.module + '.' + idStr;
            if(asModuleFormular.import && !this.extraImports.includes(asModuleFormular)) {
                this.extraImports.push(asModuleFormular)
            }
            return '';
            // sourceStr = ' = ' + asModuleFormular.module + '.' + idStr;
            // str += specifierStr + sourceStr + ';';
        } else {
            if(this.option.noModule) {
                let rp = path.relative(this.dirname, path.join(this.inputFolder, sourceValue)).replace(/\\/g, '/');
                if(rp.charAt(0) != '.') rp = './' + rp;
                str += '{' + specifierStr + '} from "' + rp + '";';
            } else {
                // specifierStr = '{' + specifierStr + '}';
                // sourceStr = ' from ' + this.codeFromAST(ast.source);
                sourceStr = ' = ' + sourceValue.replace(/\//g, '.');
                str += specifierStr + sourceStr + ';';
            }
        }
        
        return str;
    }

    private codeFromImportDefaultSpecifier(ast: ImportDefaultSpecifier): string {
        this.assert(false, ast, 'Not support ImportDefaultSpecifier yet!');
        return '';
    }

    private codeFromImportNamespaceSpecifier(ast: ImportNamespaceSpecifier): string {
        this.assert(false, ast, 'Not support ImportNamespaceSpecifier yet!');
        return '';
    }

    private codeFromImportSpecifier(ast: ImportSpecifier): string {
        let str = this.codeFromAST(ast.imported);
        return str;
    }

    private codeFromLabeledStatement(ast: LabeledStatement): string {
        this.assert(false, ast, 'Not support LabeledStatement yet!');
        return '';
    }

    private codeFromLiteral(ast: Literal): string {
        // if (ast.regex) {
        //     return ast.raw;
        // }
        let str = ast.raw;
        if(this.option.literalReplacement && this.option.literalReplacement[str]) {
            str = this.option.literalReplacement[str];
        }
        return str;
    }

    private codeFromLogicalExpression(ast: LogicalExpression): string {
        let left = this.codeFromAST(ast.left);
        if (this.calPriority(ast.left) >= this.calPriority(ast)) {
            left = '(' + left + ')';
        }
        let right = this.codeFromAST(ast.right);
        if (this.calPriority(ast.right) >= this.calPriority(ast)) {
            right = '(' + right + ')';
        }
        let optStr = ast.operator;
        let str = left + ' ' + optStr + ' ' + right;
        return str;
    }

    private codeFromMemberExpression(ast: MemberExpression): string {
        (ast.object as any).__memberExp_is_object = true;
        (ast.object as any).__parent = ast;
        // if(ast.object.type == AST_NODE_TYPES.Identifier) {
        //     (ast.object as any).__addThis = true;
        // }
        let objStr = this.codeFromAST(ast.object);
        if (AST_NODE_TYPES.TSAsExpression == (ast.object as any).type || this.calPriority(ast.object) > this.calPriority(ast)) {
            objStr = '(' + objStr + ')';
        }
        let str = objStr;
        (ast.property as any).__parent = ast;
        (ast.property as any).__memberExp_is_computed_property = ast.computed;
        let propertyStr = this.codeFromAST(ast.property);
        if (ast.computed) {
            str += '[' + propertyStr + ']';
        } else {
            str += '.' + propertyStr;
        }
        return str;
    }

    private codeFromMetaProperty(ast: MetaProperty): string {
        this.assert(false, ast, 'Not support MetaProperty yet!');
        return '';
    }

    private codeFromMethodDefinition(ast: MethodDefinition): string {
        let funcName = null;
        if (ast.key) {
            funcName = this.codeFromAST(ast.key);
        }
        if (ast.value.type == "TSEmptyBodyFunctionExpression") {
            this.assert(false, ast, 'Not support TSEmptyBodyFunctionExpression yet!');
        }
        return this.codeFromFunctionExpressionInternal(funcName, ast.static, ast.kind, ast.accessibility, ast.value as FunctionExpression);
    }

    private codeFromNewExpression(ast: NewExpression): string {
        let callee = this.codeFromAST(ast.callee);
        // if ('Date' == callee) {
        //     this.addImport('date');
        // }
        if (this.calPriority(ast.callee) > this.calPriority(ast)) {
            callee = '(' + callee + ')';
        }
        if ('Array' == callee/* && ast.arguments.length == 0*/) {
            return '[]';
        }
        let argStr = '';
        for (let i = 0, len = ast.arguments.length; i < len; i++) {
            if (i > 0) {
                argStr += ', ';
            }
            argStr += this.codeFromAST(ast.arguments[i]);
        }
        // if ('RegExp' == callee) {
        //     return argStr;
        // }
        let str = 'new ' + callee + '(' + argStr + ')';
        return str;
    }

    private codeFromObjectExpression(ast: ObjectExpression): string {
        var str = '{';
        for (let i = 0, len = ast.properties.length; i < len; i++) {
            if (i > 0) {
                str += ', ';
            }
            str += this.codeFromAST(ast.properties[i]);
        }
        return str + '}';
    }

    private codeFromObjectPattern(ast: ObjectPattern): string {
        this.assert(false, ast, 'Not support ObjectPattern yet!');
        return '';
    }

    private codeFromProgram(ast: Program): string {
        let str = '';
        for (let i = 0, len = ast.body.length; i < len; i++) {
            let stm = ast.body[i];
            let bodyStr = this.codeFromAST(stm);
            if (bodyStr) {
                if (i > 0) {
                    str += '\n';
                }
                str += bodyStr;
            }
        }
        return str;
    }

    private codeFromProperty(ast: Property): string {
        (ast.key as any).__parent = ast;
        return this.codeFromAST(ast.key) + ': ' + this.codeFromAST(ast.value);
    }

    private codeFromRestElement(ast: RestElement): string {
        return '...' + this.codeFromAST(ast.argument);
    }

    private codeFromReturnStatement(ast: ReturnStatement): string {
        let str = 'return';
        if(ast.argument) {
            str += ' ' + this.codeFromAST(ast.argument);
        }
        return str;
    }

    private codeFromSequenceExpression(ast: SequenceExpression): string {
        let str = '';
        for (var i = 0, len = ast.expressions.length; i < len; i++) {
            if (i > 0) {
                str += ', ';
            }
            str += this.codeFromAST(ast.expressions[i]);
        }
        return str;
    }

    private codeFromSpreadElement(ast: SpreadElement): string {
        return '...';
    }

    private codeFromSuper(ast: Super): string {
        return 'super';
    }

    private codeFromSwitchCase(ast: SwitchCase): string {
        let str = '';
        if (ast.test) {
            str += 'case ' + this.codeFromAST(ast.test) + ':\n';
        } else {
            str += 'default:\n';
        }
        let csqStr = '';
        for (let i = 0, len = ast.consequent.length; i < len; i++) {
            if (ast.consequent[i].type != AST_NODE_TYPES.BreakStatement) {
                if (i > 0) {
                    csqStr += '\n';
                }
                csqStr += this.codeFromAST(ast.consequent[i]);
            }
        }
        if (csqStr) {
            str += '{\n' + this.indent(csqStr) + '\n}\n';
        } 
        str += 'break;'
        return str;
    }

    private codeFromSwitchStatement(ast: SwitchStatement): string {
        let str = 'switch(' + this.codeFromAST(ast.discriminant) + ') {\n';
        let caseStr = '';
        for (let i = 0, len = ast.cases.length; i < len; i++) {
            if (i > 0) {
                caseStr += '\n';
            }
            caseStr += this.codeFromSwitchCase(ast.cases[i]);
        }
        str += this.indent(caseStr);
        str += '\n}';
        return str;
    }

    private codeFromTaggedTemplateExpression(ast: TaggedTemplateExpression): string {
        this.assert(false, ast, 'Not support TaggedTemplateExpression yet!');
        return '';
    }

    private codeFromTemplateElement(ast: TemplateElement): string {
        this.assert(false, ast, 'Not support TemplateElement yet!');
        return '';
    }

    private codeFromTemplateLiteral(ast: TemplateLiteral): string {
        this.assert(false, ast, 'Not support TemplateLiteral yet!');
        return '';
    }

    private codeFromThisExpression(ast: ThisExpression): string {
        return 'this';
    }

    private codeFromThrowStatement(ast: ThrowStatement): string {
        return 'throw ' + this.codeFromAST(ast.argument);
    }

    private codeFromTryStatement(ast: TryStatement): string {
        let str = 'try{\n';
        str += this.indent(this.codeFromAST(ast.block));
        str += '\n} ';
        if (ast.handler) {
            str += this.codeFromAST(ast.handler);
        }
        if (ast.finalizer) {
            str += ' finally {\n';
            str += this.indent(this.codeFromAST(ast.finalizer));
            str += '\n}'
        }
        str += '\n';
        return str;
    }

    private codeFromTSClassImplements(ast: TSClassImplements): string {
        let str = '';
        (ast.expression as any).__isType = true;
        str += this.codeFromAST(ast.expression);
        if(ast.typeParameters) {
            str += '<' + this.codeFromAST(ast.typeParameters) + '>';
        }
        return str;
    }

    private codeFromTSParenthesizedType(ast: TSParenthesizedType): string {
        return '(' + this.codeFromAST(ast.typeAnnotation) + ')';
    }

    private codeFromUnaryExpression(ast: UnaryExpression): string {
        let str;
        let agm = this.codeFromAST(ast.argument);
        if (ast.operator == 'typeof' || this.calPriority(ast.argument) >= this.calPriority(ast)) {
            agm = '(' + agm + ')';
        }
        if (ast.prefix) {
            str = ast.operator;
            if(str == 'delete') {
                str += ' ';
            }
            str += agm;
        } else {
            str = agm + ast.operator;
        }
        return str;
    }

    private codeFromUpdateExpression(ast: UpdateExpression): string {
        let str = this.codeFromAST(ast.argument);
        if (this.calPriority(ast.argument) >= this.calPriority(ast)) {
            str = '(' + str + ')';
        }
        if (ast.prefix) {
          str = ast.operator + str;
        } else {
          str = str + ast.operator;
        }
        return str;
    }

    private codeFromVariableDeclaration(ast: VariableDeclaration): string {
        let str = 'let ';
        for (let i = 0, len = ast.declarations.length; i < len; i++) {
            let d = ast.declarations[i];
            (d as any).__parent = ast;
            if (i > 0) {
                str += ', ';
            }
            str += this.codeFromVariableDeclarator(d);
        }
        return str;
    }

    private codeFromVariableDeclarator(ast: VariableDeclarator): string {
        (ast.id as any).__parent = ast;
        let str = this.codeFromAST(ast.id);
        if (ast.init) {
            str += ' = ' + this.codeFromAST(ast.init);
        }
        return str;
    }

    private codeFromWhileStatement(ast: WhileStatement): string {
        let str = 'while(' + this.codeFromAST(ast.test) + ') {\n';
        let bodyCode = this.indent(this.codeFromAST(ast.body));
        str += bodyCode + '\n}';
        return str;
    }

    private codeFromWithStatement(ast: WithStatement): string {
        this.assert(false, ast, 'Not support WithStatement yet');
        return '';
    }

    private codeFromYieldExpression(ast: YieldExpression): string {
        this.assert(false, ast, 'Not support YieldExpression yet');
        return '';
    }

    private codeFromTSAbstractMethodDefinition(ast: TSAbstractMethodDefinition): string {
        return this.codeFromMethodDefinition(ast as any);
    }

    private codeFromTSAsExpression(ast: TSAsExpression): string {
        let str = this.codeFromAST(ast.expression);
        let typeStr = this.codeFromAST(ast.typeAnnotation);
        if(typeStr != 'Array') {
            str += ' as ' + typeStr;
        }
        return str;
    }

    private codeFromTSDeclareFunction(ast: TSDeclareFunction): string {
        this.assert(false, ast, 'Not support TSDeclareFunction yet');
        return '';
    }

    private codeFromTSEnumDeclaration(ast: TSEnumDeclaration): string {
        this.assert(false, ast, 'Not support TSEnumDeclaration yet');
        return '';
        // let str = '';
        // if (!(ast as any).__exported) {
        //     str += 'local ';
        // }
        // let enumName = this.codeFromAST(ast.id);
        // str += enumName + ' = {\n';
        // let membersStr = '';
        // let nextValue = 0;
        // for (let i = 0, len = ast.members.length; i < len; i++) {
        //     if (i > 0) {
        //         membersStr += ',\n';
        //     }
        //     let m = ast.members[i];
        //     membersStr += this.codeFromAST(m.id) + ' = ';
        //     if (m.initializer) {
        //         membersStr += this.codeFromAST(m.initializer)
        //         nextValue = ((m.initializer as Literal).value as number) + 1;
        //     } else {
        //         membersStr += nextValue;
        //         nextValue++;
        //     }
        // }
        // str += this.indent(membersStr) + '\n';
        // str += '}';
        // this.assert(!ast.const, ast);
        // this.assert(!ast.declare, ast);
        // this.assert(!ast.modifiers, ast);
        // this.assert(!ast.decorators, ast);
        // return '';
    }

    private codeFromTSInterfaceBody(ast: TSInterfaceBody): string {
        let str = '';
        for(let i = 0, len = ast.body.length; i < len; i++) {
            if(i > 0) {
                str += '\n';
            }
            str += this.codeFromAST(ast.body[i]);
        }
        return str;
    }

    private codeFromTSMethodSignature(ast: TSMethodSignature): string {
        let str = '';
        if(ast.accessibility) {
            str += ast.accessibility + ' ';
        }
        if(ast.static) {
            str += 'static ';
        }

        str += this.codeFromAST(ast.key) + '(';
        if (ast.params) {
            for (let i = 0, len = ast.params.length; i < len; i++) {
                if (i > 0) {
                    str += ', ';
                }
                let oneParam = ast.params[i];
                (oneParam as any).__parent = ast;
                (oneParam as any).__isFuncParam = true;
                str += this.codeFromAST(oneParam);
            }
        }
        str += ')';
        if(ast.returnType) {
            str += ': ' + this.codeFromAST(ast.returnType);
        }
        str += ';';
        return str;
    }

    private codeFromTSModuleBlock(ast: TSModuleBlock): string {
        let str = '';
        for(let i = 0, len = ast.body.length; i < len; i++) {
            if(str) {
                str += '\n';
            }
            str += this.codeFromAST(ast.body[i]);
        }
        return str;
    }

    private codeFromTSModuleDeclaration(ast: TSModuleDeclaration): string {
        let str = '';
        if(!(ast as any).__parent || AST_NODE_TYPES.TSModuleDeclaration != (ast as any).__parent.type) {
            str = 'module ';
        } else {
            str = '.';
        }
        let idStr = this.codeFromAST(ast.id);
        (ast.body as any).__parent = ast;
        let bodyStr = this.codeFromAST(ast.body);
        if(!this.option.noModule && idStr != '_EMPTYMODULE_') {
            str += idStr;
            if((ast.body as any).type != AST_NODE_TYPES.TSModuleDeclaration) {
                str += ' {\n';
                str += this.TagAddImport;
                str += this.indent(bodyStr);
                str += '\n}';
            } else {
                str += bodyStr;
            }
        } else {
            str = bodyStr;
            if((ast.body as any).type != AST_NODE_TYPES.TSModuleDeclaration) {
                str = this.TagAddImport + str;
            } 
        }
        return str;
    }

    private codeFromTSInterfaceDeclaration(ast: TSInterfaceDeclaration): string {
        this.assert(!ast.implements, ast, 'not support implements yet!');
        let str = 'export interface ';
        str += this.codeFromAST(ast.id) + ' ';
        if(ast.extends) {
            str += 'extends ';
            for(let i = 0, len = ast.extends.length; i < len; i++) {
                if(i > 0) {
                    str += ', ';
                }
                str += this.codeFromAST(ast.extends[i]);
            }
            str += ' ';
        }
        str += '{\n';
        str += this.indent(this.codeFromAST(ast.body));
        str += '\n}';
        return str;
    }

    private codeFromTSTypeAssertion(ast: TSTypeAssertion): string {
        this.assert(false, ast, 'Not support TSTypeAssertion yet');
        return '';
    }

    private codeFromTSTypeAnnotation(ast: TSTypeAnnotation): string {
        let str = this.codeFromAST(ast.typeAnnotation);
        if(str == 'Array') str = 'any[]';
        return str;
    }

    private codeFromTSTypeParameterInstantiation(ast: TSTypeParameterInstantiation): string {
        let str = '';
        for(let i = 0, len = ast.params.length; i < len; i++) {
            if(i > 0) {
                str += ', ';
            }
            (ast.params[i] as any).__isType = true;
            let pstr = this.codeFromAST(ast.params[i]);
            str += pstr;
        }
        return str;
    }

    private codeFromTSTypeReference(ast: TSTypeReference): string {
        (ast.typeName as any).__isType = true;
        let str = this.codeFromAST(ast.typeName);
        if(ast.typeParameters) {
            str += '<' + this.codeFromAST(ast.typeParameters) + '>';
        } 
        return str;
    }

    private codeFromTSVoidKeyword(ast: TSVoidKeyword): string {
        return 'void';
    }

    private indent(str: string, fromLine: number = 0): string {
        let indentStr = '    ';
        // for(let i = 0; i < blockDeep; i++) {
        //   indentStr += '  ';
        // }
        let endWithNewLine = str.substr(str.length - 1) == '\n';
        let lines = str.split(/\n/);
        let newStr = '';
        for (let i = 0, len = lines.length; i < len; i++) {
            if (i > 0) {
                newStr += '\n';
            }
            if (i >= fromLine) {
                newStr += indentStr;
            }
            newStr += lines[i];
        }
        if (endWithNewLine) {
            newStr += '\n';
        }
        return newStr;
    }

    private isSimpleType(type: string): boolean {
        if(this.simpleTypes.indexOf(type) >= 0) {
            return true;
        }
        return false;
    }

    private getMemberInfo(classInfo: ClassInfo, pname: string): PropertyInfo {
        let finfo = classInfo.functionMap[pname];
        if(finfo) return finfo;
        let pinfo = classInfo.propertyMap[pname];
        if(pinfo) return pinfo;

        while(classInfo.superClass) {
            classInfo = this.analysor.classMap[classInfo.superClass];
            if(classInfo) {
                let finfo = classInfo.functionMap[pname];
                if(finfo && finfo.accessibility != 'private') {
                    return finfo;
                }
                let pinfo = classInfo.propertyMap[pname];
                if(pinfo && pinfo.accessibility != 'private') {
                    return pinfo;
                }
            } else {
                break;
            }
        }
        return null;
    }
  
    private assert(cond: boolean, ast: BaseNode, message: string = null) {
        if (!cond) {
            if (this.option.errorDetail) {
                console.log(util.inspect(ast, true, 2));
            }
            console.log('\x1B[36m%s\x1B[0m(tmp/tmp.ts:\x1B[33m%d:%d\x1B[0m) - \x1B[31merror\x1B[0m: %s', this.relativePath, 
                ast.loc ? ast.loc.start.line : -1, 
                ast.loc ? ast.loc.start.column : -1, 
                message ? message : 'Error');
            console.log(As2TsHints.ContactMsg);
            if(this.option.terminateWhenError) {
                throw new Error('[As2TS]Something wrong encountered.');
            }
        }
    }
}