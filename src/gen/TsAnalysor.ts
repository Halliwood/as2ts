import { Accessibility, ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression, AssignmentPattern, AwaitExpression, BigIntLiteral, BinaryExpression, BlockStatement, BreakStatement, CallExpression, CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassProperty, ConditionalExpression, ContinueStatement, DebuggerStatement, Decorator, DoWhileStatement, EmptyStatement, EntityName, ExportAllDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExpressionStatement, ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration, FunctionExpression, Identifier, IfStatement, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression, MetaProperty, MethodDefinition, NewExpression, ObjectExpression, ObjectPattern, Program, Property, RestElement, ReturnStatement, SequenceExpression, SpreadElement, Super, SwitchCase, SwitchStatement, TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression, ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration, VariableDeclarator, WhileStatement, WithStatement, YieldExpression, TSEnumDeclaration, BindingName, TSAsExpression, TSClassImplements, TSInterfaceDeclaration, TSTypeAssertion, TSModuleDeclaration, TSModuleBlock, TSDeclareFunction, TSAbstractMethodDefinition, TSInterfaceBody, TSImportEqualsDeclaration, TSMethodSignature, TSQualifiedName, TSTypeAnnotation, TSTypeParameterInstantiation, TSTypeReference, TSVoidKeyword, BaseNode } from '@typescript-eslint/types/dist/ts-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import util = require('util');
import path = require('path');
import {As2TsHints} from './Strings';
import { As2TsOption } from '../../typings';

export class PropertyInfo {
    name: string;
    className: string;
    accessibility: string;
    static: boolean;

    toString(): string {
        let str = '';
        if(this.accessibility == 'public') {
            str = '+';
        } else if(this.accessibility == 'protected') {
            str = '#';
        } else if(this.accessibility == 'private') {
            str = '-';
        }
        return str + this.name;
    }
}

export class FunctionInfo extends PropertyInfo {
    params: string[] = [];
    localVars: string[] = [];

    anoymousFuncCnt: number = 0;
    parentFunc: FunctionInfo;

    toString(): string {
        return super.toString() + '(' + this.params.join(', ') + ')';
    }
}

export class ClassInfo {
    name: string;
    superClass: string;
    superClassFullName: string;
    module: string;
    declare: boolean;
    propertyMap: {[name: string]: PropertyInfo} = {};
    privateProperties: string[] = [];
    functionMap: {[name: string]: FunctionInfo} = {};
    anoymousFuncCnt: number = 0;

    get fullName(): string {
        if(!this.module) return this.name;
        return this.module + '.' + this.name;
    }

    toString(): string {
        let str = this.fullName;
        if(this.superClass) {
            str += '<' + this.superClassFullName;
        }
        for(let propertyName in this.propertyMap) {
            str += '|' + this.propertyMap[propertyName];
        }
        for(let funcName in this.functionMap) {
            str += '|' + funcName;
        }
        return str;
    }
}

export class TsAnalysor {
    // 选项
    private option: As2TsOption;

    public classFullNameMap: {[fullName: string]: ClassInfo} = {};
    public classNameMap: {[name: string]: ClassInfo} = {};
    private crtModule: string;
    private crtClass: ClassInfo;
    private crtFunc: FunctionInfo;

    private fullPath: string;
    private dirname: string;
    private relativePath: string;
    private fileModule: string;
    private importedMap: {[key: string]: string};

    constructor(option: As2TsOption) {
        this.option = option || {};
    }

    collect(ast: any, inputFolder: string, filePath: string) {
        this.fullPath = filePath;
        this.relativePath = path.relative(inputFolder, filePath);
        this.dirname = path.dirname(filePath);
        if(filePath.match(/\.d\.ts$/)) {
            this.fileModule = '';
        } else {
            this.fileModule = path.relative(inputFolder, this.dirname).replace(/\\+/g, '.').replace(/\.$/, '');
        }
        this.importedMap = {};
        this.processAST(ast);
    }

    private processAST(ast: any) {
        switch (ast.type) {
            case AST_NODE_TYPES.ArrayExpression:
                this.processArrayExpression(ast);
                break;

            case AST_NODE_TYPES.ArrayPattern:
                this.processArrayPattern(ast);
                break;

            case AST_NODE_TYPES.ArrowFunctionExpression:
                this.processArrowFunctionExpression(ast);
                break;

            case AST_NODE_TYPES.AssignmentExpression:
                this.processAssignmentExpression(ast);
                break;

            case AST_NODE_TYPES.AssignmentPattern:
                this.processAssignmentPattern(ast);
                break;

            case AST_NODE_TYPES.BinaryExpression:
                this.processBinaryExpression(ast);
                break;

            case AST_NODE_TYPES.BlockStatement:
                this.processBlockStatement(ast);
                break;

            case AST_NODE_TYPES.CallExpression:
                this.processCallExpression(ast);
                break;

            case AST_NODE_TYPES.ClassBody:
                this.processClassBody(ast);
                break;

            case AST_NODE_TYPES.ClassDeclaration:
                this.processClassDeclaration(ast);
                break;

            case AST_NODE_TYPES.ClassExpression:
                this.processClassExpression(ast);
                break;

            case AST_NODE_TYPES.ClassProperty:
                this.processClassProperty(ast);
                break;

            case AST_NODE_TYPES.ConditionalExpression:
                this.processConditionalExpression(ast);
                break;

            case AST_NODE_TYPES.ExportNamedDeclaration:
                this.processExportNamedDeclaration(ast);
                break;

            case AST_NODE_TYPES.ExpressionStatement:
                this.processExpressionStatement(ast);
                break;

            case AST_NODE_TYPES.ForInStatement:
                this.processForInStatement(ast);
                break;

            case AST_NODE_TYPES.ForOfStatement:
                this.processForOfStatement(ast);
                break;

            case AST_NODE_TYPES.ForStatement:
                this.processForStatement(ast);
                break;

            case AST_NODE_TYPES.FunctionDeclaration:
                this.processFunctionDeclaration(ast);
                break;

            case AST_NODE_TYPES.FunctionExpression:
                this.processFunctionExpression(ast);
                break;

            case AST_NODE_TYPES.Identifier:
                this.processIdentifier(ast);
                break;

            case AST_NODE_TYPES.IfStatement:
                this.processIfStatement(ast);
                break;

            case AST_NODE_TYPES.ImportDeclaration:
                this.processImportDeclaration(ast);
                break;

            case AST_NODE_TYPES.LogicalExpression:
                this.processLogicalExpression(ast);
                break;

            case AST_NODE_TYPES.MemberExpression:
                this.processMemberExpression(ast);
                break;

            case AST_NODE_TYPES.MethodDefinition:
                this.processMethodDefinition(ast);
                break;

            case AST_NODE_TYPES.NewExpression:
                this.processNewExpression(ast);
                break;

            case AST_NODE_TYPES.ObjectExpression:
                this.processObjectExpression(ast);
                break;

            case AST_NODE_TYPES.ObjectPattern:
                this.processObjectPattern(ast);
                break;

            case AST_NODE_TYPES.Program:
                this.processProgram(ast);
                break;

            case AST_NODE_TYPES.Property:
                this.processProperty(ast);
                break;

            case AST_NODE_TYPES.ReturnStatement:
                this.processReturnStatement(ast);
                break;

            case AST_NODE_TYPES.SequenceExpression:
                this.processSequenceExpression(ast);
                break;

            case AST_NODE_TYPES.SwitchCase:
                this.processSwitchCase(ast);
                break;

            case AST_NODE_TYPES.SwitchStatement:
                this.processSwitchStatement(ast);
                break;

            case AST_NODE_TYPES.ThrowStatement:
                this.processThrowStatement(ast);
                break;

            case AST_NODE_TYPES.TryStatement:
                this.processTryStatement(ast);
                break;

            case AST_NODE_TYPES.UnaryExpression:
                this.processUnaryExpression(ast);
                break;

            case AST_NODE_TYPES.UpdateExpression:
                this.processUpdateExpression(ast);
                break;

            case AST_NODE_TYPES.VariableDeclaration:
                this.processVariableDeclaration(ast);
                break;

            case AST_NODE_TYPES.VariableDeclarator:
                this.processVariableDeclarator(ast);
                break;

            case AST_NODE_TYPES.WhileStatement:
                this.processWhileStatement(ast);
                break;

            case AST_NODE_TYPES.TSInterfaceBody:
                this.processTSInterfaceBody(ast);
                break;

            case AST_NODE_TYPES.TSAbstractMethodDefinition:
                this.processTSAbstractMethodDefinition(ast);
                break;

            case AST_NODE_TYPES.TSModuleBlock:
                this.processTSModuleBlock(ast);
                break;

            case AST_NODE_TYPES.TSModuleDeclaration:
                this.processTSModuleDeclaration(ast);
                break;
            
            case AST_NODE_TYPES.TSImportEqualsDeclaration:
                this.processTSImportEqualsDeclaration(ast);
                break;

            case AST_NODE_TYPES.TSInterfaceDeclaration:
                this.processTSInterfaceDeclaration(ast);
                break;

            default:
                break;
        }
    }

    private processArrayExpression(ast: ArrayExpression) {
        for (let i = 0, len = ast.elements.length; i < len; i++) {
            this.processAST(ast.elements[i]);
        }
    }

    private processArrayPattern(ast: ArrayPattern) {
        this.assert(false, ast, 'Not support ArrayPattern yet!');
    }

    private processArrowFunctionExpression(ast: ArrowFunctionExpression) {
        if (ast.params) {
            for (let i = 0, len = ast.params.length; i < len; i++) {
                let oneParam = ast.params[i];
                this.processAST(oneParam);
            }
        }
        if (ast.body) {
            this.processAST(ast.body);
        }
        this.assert(!ast.generator, ast, 'Not support generator yet!');
        this.assert(!ast.async, ast, 'Not support async yet!');
        this.assert(!ast.expression, ast, 'Not support expression yet!');
    }

    private processAssignmentExpression(ast: AssignmentExpression) {
        this.processBinaryExpression(ast as any);
    }

    private processAssignmentPattern(ast: AssignmentPattern) {
        if((ast as any).__isFuncParam) (ast.left as any).__isFuncParam = true;
        this.processAST(ast.left);
    }

    private processBinaryExpression(ast: BinaryExpression) {
        this.processAST(ast.right);
    }

    private processBlockStatement(ast: BlockStatement) {
        for (let i = 0, len = ast.body.length; i < len; i++) {
            let bodyEle = ast.body[i];
            this.processAST(bodyEle);
        }
    }

    private processCallExpression(ast: CallExpression) {
        this.processAST(ast.callee);
        for (let i = 0, len = ast.arguments.length; i < len; i++) {
            let arg = ast.arguments[i];
            this.processAST(arg);
        }
    }

    private processClassBody(ast: ClassBody) {
        for (let i = 0, len = ast.body.length; i < len; i++) {
            this.processAST(ast.body[i]);
        }
    }

    private processClassDeclaration(ast: ClassDeclaration) {
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
        this.crtClass = new ClassInfo();
        this.crtClass.declare = ast.declare;
        this.crtClass.name = className;
        this.crtClass.module = this.crtModule || this.fileModule;
        this.crtClass.anoymousFuncCnt = 0;
        this.classNameMap[this.crtClass.name] = this.crtClass;
        this.classFullNameMap[this.crtClass.fullName] = this.crtClass;
        if(ast.superClass) {
            this.crtClass.superClass = this.codeFromAST(ast.superClass);
            if(this.crtClass.superClass.indexOf('.') > 0) {
                this.crtClass.superClassFullName = this.crtClass.superClass;
            } else {
                let superModule = this.fileModule;
                if(this.crtClass.superClass in this.importedMap) {
                    superModule = this.importedMap[this.crtClass.superClass];
                }
                if(superModule) {
                    this.crtClass.superClassFullName = superModule + '.' + this.crtClass.superClass;
                } else {
                    this.crtClass.superClassFullName = this.crtClass.superClass;
                }
            }
        }
        
        this.processClassBody(ast.body);
        this.crtClass = null;
    }

    private processClassExpression(ast: ClassExpression) {
        this.processClassDeclaration(ast as any);
    }

    private processClassProperty(ast: ClassProperty) {
        let propertyName = this.codeFromAST(ast.key);
        if(this.crtClass) {
            let propertyInfo = new PropertyInfo();
            propertyInfo.name = propertyName;
            propertyInfo.accessibility = ast.accessibility;
            propertyInfo.static = ast.static;
            propertyInfo.className = this.crtClass.name;
            this.crtClass.propertyMap[propertyName] = propertyInfo;
        }
        if(ast.value) {
            this.processAST(ast.value);
        }
    }

    private processConditionalExpression(ast: ConditionalExpression) {
        this.processAST(ast.test);
        this.processAST(ast.consequent);
        this.processAST(ast.alternate);
    }

    private processExportNamedDeclaration(ast: ExportNamedDeclaration) {
        this.processAST(ast.declaration);
    }

    private processExpressionStatement(ast: ExpressionStatement) {
        this.processAST(ast.expression);
    }

    private processForInStatement(ast: ForInStatement) {
        this.processAST(ast.left);
        this.processAST(ast.right);
        this.processAST(ast.body);
    }

    private processForOfStatement(ast: ForOfStatement) {
        this.processAST(ast.left);
        this.processAST(ast.right);
        this.processAST(ast.body);
    }

    private processForStatement(ast: ForStatement) {
        this.processAST(ast.init);
        this.processAST(ast.test);
        this.processAST(ast.update);
        this.processAST(ast.body);
    }

    private processFunctionDeclaration(ast: FunctionDeclaration) {
        this.processFunctionExpression(ast as any);
    }

    private processFunctionExpression(ast: FunctionExpression) {
        this.processFunctionExpressionInternal(null, false, null, null, ast);
    }

    private processFunctionExpressionInternal(funcName: string, isStatic: boolean, kind: string, accessibility: Accessibility, ast: FunctionExpression) {
        if (!funcName && ast.id) {
            funcName = this.codeFromAST(ast.id);
        }
        // if(this.fullPath.indexOf('WxRoot') >= 0) {
        //     console.log('processFunctionExpression: ', funcName ? funcName : 'no name', ast.params ? ast.params.length : 'no param');
        // }

        if(this.crtClass) {
            if(funcName == this.crtClass.name) funcName = 'constructor';
            let funcInfo = new FunctionInfo();
            funcInfo.anoymousFuncCnt = 0;
            funcInfo.accessibility = accessibility;
            funcInfo.static = isStatic;
            funcInfo.className = this.crtClass.name;
            if(this.crtFunc) {
                // 这是函数内的一个匿名函数
                this.assert(!funcName, ast, 'It should be an anoymous function!');
                this.crtFunc.anoymousFuncCnt++;
                funcInfo.name = this.crtFunc.name + '~' + this.crtFunc.anoymousFuncCnt;
                funcInfo.parentFunc = this.crtFunc;
            } else {
                if(!funcName) {
                    // 这是一个函数外的匿名函数
                    this.crtClass.anoymousFuncCnt++;
                    funcName = '~function' + this.crtClass.anoymousFuncCnt;
                }
                funcInfo.name = funcName;
                funcInfo.parentFunc = null;
            }
            // if(this.fullPath.indexOf('WxRoot') >= 0) {
            //     console.log('func: ', funcInfo.toString());
            // }
            this.crtClass.functionMap[funcInfo.name] = funcInfo;
            this.crtFunc = funcInfo;
        }
        if (ast.params) {
            for (let i = 0, len = ast.params.length; i < len; i++) {
                let oneParam = ast.params[i];
                (oneParam as any).__parent = ast;
                (oneParam as any).__isFuncParam = true;
                this.processAST(oneParam);
            }
        }
        if(ast.body) this.processAST(ast.body);
        this.crtFunc = this.crtFunc.parentFunc;
    }

    private processIdentifier(ast: Identifier) {
        let str = ast.name;
        if((ast as any).__isFuncParam && this.crtFunc) {
            this.crtFunc.params.push(str);
        }
    }

    private processIfStatement(ast: IfStatement) {
        this.processAST(ast.test);
        this.processAST(ast.consequent);
        if (ast.alternate && (ast.alternate.type != AST_NODE_TYPES.BlockStatement || (ast.alternate as BlockStatement).body.length > 0)) {
            this.processAST(ast.alternate);
        }
    }

    private processImportDeclaration(ast: ImportDeclaration) {
        let sourceValue = ast.source.value as string;
        let dotPos = sourceValue.lastIndexOf('/');
        let idStr = sourceValue;
        let importModule = '';
        if(dotPos > 0) {
            idStr = sourceValue.substr(dotPos + 1);
            importModule = sourceValue.substring(0, dotPos);
        }

        for(let i = 0, len = ast.specifiers.length; i < len; i++) {
            let ss = this.codeFromAST(ast.specifiers[i]);
            if(ss in this.importedMap) continue;
            this.importedMap[ss] = importModule.replace(/\//g, '.');
        }
    }

    private processLogicalExpression(ast: LogicalExpression) {
        this.processAST(ast.left);
        this.processAST(ast.right);
    }

    private processMemberExpression(ast: MemberExpression) {
        this.processAST(ast.object);
        this.processAST(ast.property);
    }

    private processMethodDefinition(ast: MethodDefinition) {
        let funcName = null;
        if (ast.key) {
            funcName = this.codeFromAST(ast.key);
        }
        this.processFunctionExpressionInternal(funcName, ast.static, ast.kind, ast.accessibility, ast.value as FunctionExpression);
    }

    private processNewExpression(ast: NewExpression) {
        this.processAST(ast.callee);
        for (let i = 0, len = ast.arguments.length; i < len; i++) {
            this.processAST(ast.arguments[i]);
        }
    }

    private processObjectExpression(ast: ObjectExpression) {
        for (let i = 0, len = ast.properties.length; i < len; i++) {
            this.processAST(ast.properties[i]);
        }
    }

    private processObjectPattern(ast: ObjectPattern) {
        this.assert(false, ast, 'Not support ObjectPattern yet!');
    }

    private processProgram(ast: Program) {
        for (let i = 0, len = ast.body.length; i < len; i++) {
            let stm = ast.body[i];
            this.processAST(stm);
        }
    }

    private processProperty(ast: Property) {
        this.processAST(ast.key);
        this.processAST(ast.value);
    }

    private processReturnStatement(ast: ReturnStatement) {
        if(ast.argument) {
            this.processAST(ast.argument);
        }
    }

    private processSequenceExpression(ast: SequenceExpression) {
        for (var i = 0, len = ast.expressions.length; i < len; i++) {
            this.processAST(ast.expressions[i]);
        }
    }

    private processSwitchCase(ast: SwitchCase) {
        if (ast.test) {
            this.processAST(ast.test);
        }
        for (let i = 0, len = ast.consequent.length; i < len; i++) {
            if (ast.consequent[i].type != AST_NODE_TYPES.BreakStatement) {
                this.processAST(ast.consequent[i]);
            }
        }
    }

    private processSwitchStatement(ast: SwitchStatement) {
        this.processAST(ast.discriminant) ;
        for (let i = 0, len = ast.cases.length; i < len; i++) {
            this.processSwitchCase(ast.cases[i]);
        }
    }

    private processThrowStatement(ast: ThrowStatement) {
        this.processAST(ast.argument);
    }

    private processTryStatement(ast: TryStatement) {
        this.processAST(ast.block);
        if (ast.handler) {
            this.processAST(ast.handler);
        }
        if (ast.finalizer) {
            this.processAST(ast.finalizer);
        }
    }

    private processUnaryExpression(ast: UnaryExpression) {
        this.processAST(ast.argument);
    }

    private processUpdateExpression(ast: UpdateExpression) {
        this.processAST(ast.argument);
    }

    private processVariableDeclaration(ast: VariableDeclaration) {
        for (let i = 0, len = ast.declarations.length; i < len; i++) {
            let d = ast.declarations[i];
            this.processVariableDeclarator(d);
        }
    }

    private processVariableDeclarator(ast: VariableDeclarator) {
        this.processAST(ast.id);
        if (ast.init) {
            this.processAST(ast.init);
        }
    }

    private processWhileStatement(ast: WhileStatement) {
        this.processAST(ast.test);
        this.processAST(ast.body);
    }

    private processTSInterfaceBody(ast: TSInterfaceBody) {
        for(let i = 0, len = ast.body.length; i < len; i++) {
            this.codeFromAST(ast.body[i]);
        }
    }

    private processTSAbstractMethodDefinition(ast: TSAbstractMethodDefinition) {
        this.processMethodDefinition(ast as any);
    }

    private processTSModuleBlock(ast: TSModuleBlock) {
        for(let i = 0, len = ast.body.length; i < len; i++) {
            this.processAST(ast.body[i]);
        }
        this.crtModule = null;
    }

    private processTSModuleDeclaration(ast: TSModuleDeclaration) {
        let mid = this.codeFromAST(ast.id);
        if('_EMPTYMODULE_' == mid) {
            this.crtModule = '';
        } else {
            if(this.crtModule) {
                this.crtModule += '.' + mid;
            } else {
                this.crtModule = mid;
            }
        }
        this.processAST(ast.body);
    }

    private processTSImportEqualsDeclaration(ast: TSImportEqualsDeclaration) {
        let idStr = this.codeFromAST(ast.id);
        let refRstr = this.codeFromAST((ast.moduleReference as TSQualifiedName).right); 
        if(idStr == refRstr) {
            let refLStr = this.codeFromAST((ast.moduleReference as TSQualifiedName).left);
            this.importedMap[idStr] = refLStr;
        }
    }

    private processTSInterfaceDeclaration(ast: TSInterfaceDeclaration) {
        let className = this.codeFromAST(ast.id);
        this.crtClass = new ClassInfo();
        this.crtClass.name = className;
        this.crtClass.module = this.crtModule || this.fileModule;
        this.crtClass.anoymousFuncCnt = 0;
        this.classNameMap[this.crtClass.name] = this.crtClass;
        this.classFullNameMap[this.crtClass.fullName] = this.crtClass;
    }

    private codeFromAST(ast: any): string {
        let str = '';
        switch(ast.type) {
            case AST_NODE_TYPES.Identifier:
                str += this.codeFromIdentifier(ast);
                break;
            
            case AST_NODE_TYPES.ImportSpecifier:
                str += this.codeFromImportSpecifier(ast);
                break;

            case AST_NODE_TYPES.MemberExpression:
                str += this.codeFromMemberExpression(ast);
                break;

            case AST_NODE_TYPES.TSQualifiedName:
                str += this.codeFromTSQualifiedName(ast);
                break;
            
            default:
                this.assert(false, ast, '[ERROR]Analyse ast error, not support: ' + (ast as any).type);
                break;
        }
        return str;
    }
    
    private codeFromIdentifier(ast: Identifier): string {
        return ast.name;
    }

    private codeFromImportSpecifier(ast: ImportSpecifier): string {
        let str = this.codeFromAST(ast.imported);
        return str;
    }

    private codeFromMemberExpression(ast: MemberExpression): string {
        let objStr = this.codeFromAST(ast.object);
        let str = objStr;
        let propertyStr = this.codeFromAST(ast.property);
        if (ast.computed) {
            str += '[' + propertyStr + ']';
        } else {
            str += '.' + propertyStr;
        }
        return str;
    }

    private codeFromTSQualifiedName(ast: TSQualifiedName) {
        ast.left
    }
  
    private assert(cond: boolean, ast: BaseNode, message: string = null) {
        if (!cond) {
            if (this.option.errorDetail) {
                console.log(util.inspect(ast, true, 6));
            }
            console.log('\x1B[36m%s\x1B[0m\x1B[33m%d:%d\x1B[0m - \x1B[31merror\x1B[0m: %s', this.fullPath, ast.loc ? ast.loc.start.line : -1, ast.loc ? ast.loc.start.column : -1, message ? message : 'Error');
            console.log(As2TsHints.ContactMsg);
            if(this.option.terminateWhenError) {
                throw new Error('[As2TS]Something wrong encountered.');
            }
        }
    }

    toString(): string {
        let str = '';
        for(let fullName in this.classFullNameMap) {
            str += this.classFullNameMap[fullName].toString() + '\n';
        }
        return str;
    }
}