"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsAnalysor = exports.ClassInfo = exports.FunctionInfo = exports.PropertyInfo = void 0;
var typescript_estree_1 = require("@typescript-eslint/typescript-estree");
var util = require("util");
var Strings_1 = require("./Strings");
var PropertyInfo = /** @class */ (function () {
    function PropertyInfo() {
    }
    PropertyInfo.prototype.toString = function () {
        var str = '';
        if (this.accessibility == 'public') {
            str = '+';
        }
        else if (this.accessibility == 'protected') {
            str = '#';
        }
        else if (this.accessibility == 'private') {
            str = '-';
        }
        return str + this.name;
    };
    return PropertyInfo;
}());
exports.PropertyInfo = PropertyInfo;
var FunctionInfo = /** @class */ (function (_super) {
    __extends(FunctionInfo, _super);
    function FunctionInfo() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.params = [];
        return _this;
    }
    FunctionInfo.prototype.toString = function () {
        return _super.prototype.toString.call(this) + '(' + this.params.join(', ') + ')';
    };
    return FunctionInfo;
}(PropertyInfo));
exports.FunctionInfo = FunctionInfo;
var ClassInfo = /** @class */ (function () {
    function ClassInfo() {
        this.propertyMap = {};
        this.privateProperties = [];
        this.functionMap = {};
    }
    ClassInfo.prototype.toString = function () {
        var str = this.module + '.' + this.name;
        for (var propertyName in this.propertyMap) {
            str += '|' + this.propertyMap[propertyName];
        }
        for (var funcName in this.functionMap) {
            str += '|' + funcName;
        }
        return str;
    };
    return ClassInfo;
}());
exports.ClassInfo = ClassInfo;
var TsAnalysor = /** @class */ (function () {
    function TsAnalysor(option) {
        this.classMap = {};
        this.option = option || {};
    }
    TsAnalysor.prototype.collect = function (ast, fullPath, relativePath) {
        this.fullPath = fullPath;
        this.relativePath = relativePath;
        if (relativePath) {
            var modulePath = relativePath.replace(/\\/g, '/');
            var pos = modulePath.lastIndexOf('/');
            if (pos >= 0) {
                this.module = modulePath.substring(0, pos + 1);
            }
            else {
                this.module = '';
            }
        }
        this.processAST(ast);
    };
    TsAnalysor.prototype.processAST = function (ast) {
        var str = '';
        switch (ast.type) {
            case typescript_estree_1.AST_NODE_TYPES.BlockStatement:
                str += this.processBlockStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassBody:
                str += this.processClassBody(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassDeclaration:
                str += this.processClassDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassExpression:
                str += this.processClassExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassProperty:
                str += this.processClassProperty(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ExportNamedDeclaration:
                str += this.processExportNamedDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ExpressionStatement:
                str += this.processExpressionStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.FunctionDeclaration:
                str += this.processFunctionDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.FunctionExpression:
                str += this.processFunctionExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Identifier:
                str += this.processIdentifier(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.MethodDefinition:
                str += this.processMethodDefinition(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Program:
                str += this.processProgram(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSAbstractMethodDefinition:
                str += this.processTSAbstractMethodDefinition(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSModuleBlock:
                str += this.processTSModuleBlock(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSModuleDeclaration:
                str += this.processTSModuleDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSInterfaceDeclaration:
                str += this.processTSInterfaceDeclaration(ast);
                break;
            default:
                break;
        }
    };
    TsAnalysor.prototype.processBlockStatement = function (ast) {
        for (var i = 0, len = ast.body.length; i < len; i++) {
            var bodyEle = ast.body[i];
            this.processAST(bodyEle);
        }
    };
    TsAnalysor.prototype.processClassBody = function (ast) {
        for (var i = 0, len = ast.body.length; i < len; i++) {
            this.processAST(ast.body[i]);
        }
    };
    TsAnalysor.prototype.processClassDeclaration = function (ast) {
        if (ast.typeParameters) {
            // typeParameters?: TSTypeParameterDeclaration;
        }
        if (ast.superTypeParameters) {
            // TSTypeParameterInstantiation;
        }
        if (!ast.id) {
            this.assert(false, ast, 'Class name is necessary!');
        }
        var className = this.codeFromAST(ast.id);
        this.crtClass = new ClassInfo();
        this.crtClass.name = className;
        this.crtClass.module = this.crtModule || this.module;
        this.classMap[className] = this.crtClass;
        if (ast.superClass)
            this.crtClass.superClass = this.codeFromAST(ast.superClass);
        this.processClassBody(ast.body);
        this.crtClass = null;
    };
    TsAnalysor.prototype.processClassExpression = function (ast) {
        this.processClassDeclaration(ast);
    };
    TsAnalysor.prototype.processClassProperty = function (ast) {
        var propertyName = this.codeFromAST(ast.key);
        if (this.crtClass) {
            var propertyInfo = new PropertyInfo();
            propertyInfo.name = propertyName;
            propertyInfo.accessibility = ast.accessibility;
            propertyInfo.static = ast.static;
            propertyInfo.className = this.crtClass.name;
            this.crtClass.propertyMap[propertyName] = propertyInfo;
        }
    };
    TsAnalysor.prototype.processExportNamedDeclaration = function (ast) {
        this.processAST(ast.declaration);
    };
    TsAnalysor.prototype.processExpressionStatement = function (ast) {
        this.processAST(ast.expression);
    };
    TsAnalysor.prototype.processFunctionDeclaration = function (ast) {
        this.processFunctionExpression(ast);
    };
    TsAnalysor.prototype.processFunctionExpression = function (ast) {
        this.processFunctionExpressionInternal(null, false, null, null, ast);
    };
    TsAnalysor.prototype.processFunctionExpressionInternal = function (funcName, isStatic, kind, accessibility, ast) {
        if (!funcName && ast.id) {
            funcName = this.codeFromAST(ast.id);
        }
        if (!funcName) {
            funcName = 'function';
        }
        if (this.crtClass) {
            if (funcName == this.crtClass.name)
                funcName = 'constructor';
            this.crtFunc = new FunctionInfo();
            this.crtFunc.name = funcName;
            this.crtFunc.accessibility = accessibility;
            this.crtFunc.static = isStatic;
            this.crtFunc.className = this.crtClass.name;
            this.crtClass.functionMap[funcName] = this.crtFunc;
        }
        if (ast.params) {
            for (var i = 0, len = ast.params.length; i < len; i++) {
                var oneParam = ast.params[i];
                oneParam.__parent = ast;
                oneParam.__isFuncParam = true;
                this.processAST(oneParam);
            }
        }
        this.crtFunc = null;
    };
    TsAnalysor.prototype.processIdentifier = function (ast) {
        var str = ast.name;
        if (ast.__isFuncParam && this.crtFunc) {
            this.crtFunc.params.push(str);
        }
    };
    TsAnalysor.prototype.processMethodDefinition = function (ast) {
        var funcName = null;
        if (ast.key) {
            funcName = this.codeFromAST(ast.key);
        }
        this.processFunctionExpressionInternal(funcName, ast.static, ast.kind, ast.accessibility, ast.value);
    };
    TsAnalysor.prototype.processProgram = function (ast) {
        for (var i = 0, len = ast.body.length; i < len; i++) {
            var stm = ast.body[i];
            this.processAST(stm);
        }
    };
    TsAnalysor.prototype.processTSAbstractMethodDefinition = function (ast) {
        this.processMethodDefinition(ast);
    };
    TsAnalysor.prototype.processTSModuleBlock = function (ast) {
        for (var i = 0, len = ast.body.length; i < len; i++) {
            this.processAST(ast.body[i]);
        }
    };
    TsAnalysor.prototype.processTSModuleDeclaration = function (ast) {
        this.crtModule = this.codeFromAST(ast.id);
        if (ast.body) {
            this.processAST(ast.body);
        }
        this.crtModule = null;
    };
    TsAnalysor.prototype.processTSInterfaceDeclaration = function (ast) {
        var className = this.codeFromAST(ast.id);
        this.crtClass = new ClassInfo();
        this.crtClass.name = className;
        this.crtClass.module = this.crtModule || this.module;
        this.classMap[className] = this.crtClass;
    };
    TsAnalysor.prototype.codeFromAST = function (ast) {
        var str = '';
        switch (ast.type) {
            case typescript_estree_1.AST_NODE_TYPES.Identifier:
                str += this.codeFromIdentifier(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.MemberExpression:
                str += this.codeFromMemberExpression(ast);
                break;
            default:
                this.assert(false, ast, '[ERROR]Analyse ast error, not support: ' + ast.type);
                break;
        }
        return str;
    };
    TsAnalysor.prototype.codeFromIdentifier = function (ast) {
        return ast.name;
    };
    TsAnalysor.prototype.codeFromMemberExpression = function (ast) {
        var objStr = this.codeFromAST(ast.object);
        var str = objStr;
        var propertyStr = this.codeFromAST(ast.property);
        if (ast.computed) {
            str += '[' + propertyStr + ']';
        }
        else {
            str += '.' + propertyStr;
        }
        return str;
    };
    TsAnalysor.prototype.assert = function (cond, ast, message) {
        if (message === void 0) { message = null; }
        if (!cond) {
            if (this.option.errorDetail) {
                console.log(util.inspect(ast, true, 6));
            }
            console.log('\x1B[36m%s\x1B[0m\x1B[33m%d:%d\x1B[0m - \x1B[31merror\x1B[0m: %s', this.fullPath, ast.loc ? ast.loc.start.line : -1, ast.loc ? ast.loc.start.column : -1, message ? message : 'Error');
            console.log(Strings_1.As2TsHints.ContactMsg);
            if (this.option.terminateWhenError) {
                throw new Error('[As2TS]Something wrong encountered.');
            }
        }
    };
    TsAnalysor.prototype.toString = function () {
        var str = '';
        for (var className in this.classMap) {
            str += this.classMap[className].toString() + '\n';
        }
        return str;
    };
    return TsAnalysor;
}());
exports.TsAnalysor = TsAnalysor;
