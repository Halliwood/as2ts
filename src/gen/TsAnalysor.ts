import { Accessibility, ArrayExpression, ArrayPattern, ArrowFunctionExpression, AssignmentExpression, AssignmentPattern, AwaitExpression, BigIntLiteral, BinaryExpression, BlockStatement, BreakStatement, CallExpression, CatchClause, ClassBody, ClassDeclaration, ClassExpression, ClassProperty, ConditionalExpression, ContinueStatement, DebuggerStatement, Decorator, DoWhileStatement, EmptyStatement, ExportAllDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExpressionStatement, ForInStatement, ForOfStatement, ForStatement, FunctionDeclaration, FunctionExpression, Identifier, IfStatement, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, LabeledStatement, Literal, LogicalExpression, MemberExpression, MetaProperty, MethodDefinition, NewExpression, ObjectExpression, ObjectPattern, Program, Property, RestElement, ReturnStatement, SequenceExpression, SpreadElement, Super, SwitchCase, SwitchStatement, TaggedTemplateExpression, TemplateElement, TemplateLiteral, ThisExpression, ThrowStatement, TryStatement, UnaryExpression, UpdateExpression, VariableDeclaration, VariableDeclarator, WhileStatement, WithStatement, YieldExpression, TSEnumDeclaration, BindingName, TSAsExpression, TSClassImplements, TSInterfaceDeclaration, TSTypeAssertion, TSModuleDeclaration, TSModuleBlock, TSDeclareFunction, TSAbstractMethodDefinition, TSInterfaceBody, TSMethodSignature, TSTypeAnnotation, TSTypeParameterInstantiation, TSTypeReference, TSVoidKeyword, BaseNode } from '@typescript-eslint/types/dist/ts-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { As2TsImportRule, As2TsOption } from '.';
import util = require('util');
import path = require('path');

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

    toString(): string {
        return super.toString() + '(' + this.params.join(', ') + ')';
    }
}

export class ClassInfo {
    name: string;
    superClass: string;
    propertyMap: {[name: string]: PropertyInfo} = {};
    privateProperties: string[] = [];
    functionMap: {[name: string]: FunctionInfo} = {};

    toString(): string {
        let str = this.name;
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

    public classMap: {[name: string]: ClassInfo} = {};
    private crtClass: ClassInfo;
    private crtFunc: FunctionInfo;

    private relativePath: string;

    constructor(option: As2TsOption) {
        this.option = option || {};
    }

    collect(ast: any, relativePath: string) {
        this.relativePath = relativePath;
        this.processAST(ast);
    }

    private processAST(ast: any) {
        let str = '';
        switch (ast.type) {

            case AST_NODE_TYPES.BlockStatement:
                str += this.processBlockStatement(ast);
                break;

            case AST_NODE_TYPES.ClassBody:
                str += this.processClassBody(ast);
                break;

            case AST_NODE_TYPES.ClassDeclaration:
                str += this.processClassDeclaration(ast);
                break;

            case AST_NODE_TYPES.ClassExpression:
                str += this.processClassExpression(ast);
                break;

            case AST_NODE_TYPES.ClassProperty:
                str += this.processClassProperty(ast);
                break;

            case AST_NODE_TYPES.ExportNamedDeclaration:
                str += this.processExportNamedDeclaration(ast);
                break;

            case AST_NODE_TYPES.ExpressionStatement:
                str += this.processExpressionStatement(ast);
                break;

            case AST_NODE_TYPES.FunctionDeclaration:
                str += this.processFunctionDeclaration(ast);
                break;

            case AST_NODE_TYPES.FunctionExpression:
                str += this.processFunctionExpression(ast);
                break;

            case AST_NODE_TYPES.Identifier:
                str += this.processIdentifier(ast);
                break;

            case AST_NODE_TYPES.MethodDefinition:
                str += this.processMethodDefinition(ast);
                break;

            case AST_NODE_TYPES.Program:
                str += this.processProgram(ast);
                break;

            case AST_NODE_TYPES.TSAbstractMethodDefinition:
                str += this.processTSAbstractMethodDefinition(ast);
                break;

            case AST_NODE_TYPES.TSModuleBlock:
                str += this.processTSModuleBlock(ast);
                break;

            case AST_NODE_TYPES.TSModuleDeclaration:
                str += this.processTSModuleDeclaration(ast);
                break;

            default:
                break;
        }
    }

    private processBlockStatement(ast: BlockStatement) {
        for (let i = 0, len = ast.body.length; i < len; i++) {
            let bodyEle = ast.body[i];
            this.processAST(bodyEle);
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
        this.crtClass.name = className;
        this.classMap[className] = this.crtClass;
        if(ast.superClass) this.crtClass.superClass = this.codeFromAST(ast.superClass);
        
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
    }

    private processExportNamedDeclaration(ast: ExportNamedDeclaration) {
        this.processAST(ast.declaration);
    }

    private processExpressionStatement(ast: ExpressionStatement) {
        this.processAST(ast.expression);
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
        if(!funcName) {
            funcName = 'function';
        }

        if(this.crtClass) {
            this.crtFunc = new FunctionInfo();
            this.crtFunc.name = funcName;
            this.crtFunc.accessibility = accessibility;
            this.crtFunc.static = isStatic;
            this.crtFunc.className = this.crtClass.name;
            this.crtClass.functionMap[funcName] = this.crtFunc;
        }
        if (ast.params) {
            for (let i = 0, len = ast.params.length; i < len; i++) {
                let oneParam = ast.params[i];
                (oneParam as any).__parent = ast;
                (oneParam as any).__isFuncParam = true;
                this.processAST(oneParam);
            }
        }
        this.crtFunc = null;
    }

    private processIdentifier(ast: Identifier) {
        let str = ast.name;
        if((ast as any).__isFuncParam && this.crtFunc) {
            this.crtFunc.params.push(str);
        }
    }

    private processMethodDefinition(ast: MethodDefinition) {
        let funcName = null;
        if (ast.key) {
            funcName = this.codeFromAST(ast.key);
        }
        this.processFunctionExpressionInternal(funcName, ast.static, ast.kind, ast.accessibility, ast.value as FunctionExpression);
    }

    private processProgram(ast: Program) {
        for (let i = 0, len = ast.body.length; i < len; i++) {
            let stm = ast.body[i];
            this.processAST(stm);
        }
    }

    private processTSAbstractMethodDefinition(ast: TSAbstractMethodDefinition) {
        this.processMethodDefinition(ast as any);
    }

    private processTSModuleBlock(ast: TSModuleBlock) {
        for(let i = 0, len = ast.body.length; i < len; i++) {
            this.processAST(ast.body[i]);
        }
    }

    private processTSModuleDeclaration(ast: TSModuleDeclaration) {
        if(ast.body) {
            this.processAST(ast.body);
        }
    }

    private codeFromAST(ast: any): string {
        if((ast as any).type == AST_NODE_TYPES.Identifier) {
            return (ast as Identifier).name;
        } else {
            this.assert(false, ast, '[ERROR]Analyse ast error, not support: ' + (ast as any).type);
        }
    }
  
    private assert(cond: boolean, ast: BaseNode, message: string = null) {
        if (!cond) {
            if (this.option.errorDetail) {
                console.log(util.inspect(ast, true, 6));
            }
            console.log('\x1B[36m%s\x1B[0m(tmp/tmp.ts:\x1B[33m%d:%d\x1B[0m) - \x1B[31merror\x1B[0m: %s', this.relativePath, ast.loc.start.line, ast.loc.start.column, message ? message : 'Error');
            if(this.option.terminateWhenError) {
                throw new Error('[As2TS]Something wrong encountered.');
            }
        }
    }

    toString(): string {
        let str = '';
        for(let className in this.classMap) {
            str += this.classMap[className].toString() + '\n';
        }
        return str;
    }
}