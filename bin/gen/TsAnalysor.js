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
var path = require("path");
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
        _this.localVars = [];
        _this.anoymousFuncCnt = 0;
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
        this.anoymousFuncCnt = 0;
    }
    Object.defineProperty(ClassInfo.prototype, "fullName", {
        get: function () {
            if (!this.module)
                return this.name;
            return this.module + '.' + this.name;
        },
        enumerable: false,
        configurable: true
    });
    ClassInfo.prototype.toString = function () {
        var str = this.fullName;
        if (this.superClass) {
            str += '<' + this.superClassFullName;
        }
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
        this.classFullNameMap = {};
        this.classNameMap = {};
        this.option = option || {};
    }
    TsAnalysor.prototype.collect = function (ast, inputFolder, filePath) {
        this.fullPath = filePath;
        this.relativePath = path.relative(inputFolder, filePath);
        this.dirname = path.dirname(filePath);
        if (filePath.match(/\.d\.ts$/)) {
            this.fileModule = '';
        }
        else {
            this.fileModule = path.relative(inputFolder, this.dirname).replace(/\\+/g, '.').replace(/\.$/, '');
        }
        this.importedMap = {};
        this.processAST(ast);
    };
    TsAnalysor.prototype.processAST = function (ast) {
        switch (ast.type) {
            case typescript_estree_1.AST_NODE_TYPES.ArrayExpression:
                this.processArrayExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ArrayPattern:
                this.processArrayPattern(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ArrowFunctionExpression:
                this.processArrowFunctionExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.AssignmentExpression:
                this.processAssignmentExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.AssignmentPattern:
                this.processAssignmentPattern(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.BinaryExpression:
                this.processBinaryExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.BlockStatement:
                this.processBlockStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.CallExpression:
                this.processCallExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassBody:
                this.processClassBody(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassDeclaration:
                this.processClassDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassExpression:
                this.processClassExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ClassProperty:
                this.processClassProperty(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ConditionalExpression:
                this.processConditionalExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ExportNamedDeclaration:
                this.processExportNamedDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ExpressionStatement:
                this.processExpressionStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ForInStatement:
                this.processForInStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ForOfStatement:
                this.processForOfStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ForStatement:
                this.processForStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.FunctionDeclaration:
                this.processFunctionDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.FunctionExpression:
                this.processFunctionExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Identifier:
                this.processIdentifier(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.IfStatement:
                this.processIfStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ImportDeclaration:
                this.processImportDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.LogicalExpression:
                this.processLogicalExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.MemberExpression:
                this.processMemberExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.MethodDefinition:
                this.processMethodDefinition(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.NewExpression:
                this.processNewExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ObjectExpression:
                this.processObjectExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ObjectPattern:
                this.processObjectPattern(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Program:
                this.processProgram(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.Property:
                this.processProperty(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ReturnStatement:
                this.processReturnStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.SequenceExpression:
                this.processSequenceExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.SwitchCase:
                this.processSwitchCase(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.SwitchStatement:
                this.processSwitchStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ThrowStatement:
                this.processThrowStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TryStatement:
                this.processTryStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.UnaryExpression:
                this.processUnaryExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.UpdateExpression:
                this.processUpdateExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.VariableDeclaration:
                this.processVariableDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.VariableDeclarator:
                this.processVariableDeclarator(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.WhileStatement:
                this.processWhileStatement(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSInterfaceBody:
                this.processTSInterfaceBody(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSAbstractMethodDefinition:
                this.processTSAbstractMethodDefinition(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSModuleBlock:
                this.processTSModuleBlock(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSModuleDeclaration:
                this.processTSModuleDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSImportEqualsDeclaration:
                this.processTSImportEqualsDeclaration(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSInterfaceDeclaration:
                this.processTSInterfaceDeclaration(ast);
                break;
            default:
                break;
        }
    };
    TsAnalysor.prototype.processArrayExpression = function (ast) {
        for (var i = 0, len = ast.elements.length; i < len; i++) {
            this.processAST(ast.elements[i]);
        }
    };
    TsAnalysor.prototype.processArrayPattern = function (ast) {
        this.assert(false, ast, 'Not support ArrayPattern yet!');
    };
    TsAnalysor.prototype.processArrowFunctionExpression = function (ast) {
        if (ast.params) {
            for (var i = 0, len = ast.params.length; i < len; i++) {
                var oneParam = ast.params[i];
                this.processAST(oneParam);
            }
        }
        if (ast.body) {
            this.processAST(ast.body);
        }
        this.assert(!ast.generator, ast, 'Not support generator yet!');
        this.assert(!ast.async, ast, 'Not support async yet!');
        this.assert(!ast.expression, ast, 'Not support expression yet!');
    };
    TsAnalysor.prototype.processAssignmentExpression = function (ast) {
        this.processBinaryExpression(ast);
    };
    TsAnalysor.prototype.processAssignmentPattern = function (ast) {
        if (ast.__isFuncParam)
            ast.left.__isFuncParam = true;
        this.processAST(ast.left);
    };
    TsAnalysor.prototype.processBinaryExpression = function (ast) {
        this.processAST(ast.right);
    };
    TsAnalysor.prototype.processBlockStatement = function (ast) {
        for (var i = 0, len = ast.body.length; i < len; i++) {
            var bodyEle = ast.body[i];
            this.processAST(bodyEle);
        }
    };
    TsAnalysor.prototype.processCallExpression = function (ast) {
        this.processAST(ast.callee);
        for (var i = 0, len = ast.arguments.length; i < len; i++) {
            var arg = ast.arguments[i];
            this.processAST(arg);
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
        this.crtClass.declare = ast.declare;
        this.crtClass.name = className;
        this.crtClass.module = this.crtModule || this.fileModule;
        this.crtClass.anoymousFuncCnt = 0;
        this.classNameMap[this.crtClass.name] = this.crtClass;
        this.classFullNameMap[this.crtClass.fullName] = this.crtClass;
        if (ast.superClass) {
            this.crtClass.superClass = this.codeFromAST(ast.superClass);
            if (this.crtClass.superClass.indexOf('.') > 0) {
                this.crtClass.superClassFullName = this.crtClass.superClass;
            }
            else {
                var superModule = this.fileModule;
                if (this.crtClass.superClass in this.importedMap) {
                    superModule = this.importedMap[this.crtClass.superClass];
                }
                if (superModule) {
                    this.crtClass.superClassFullName = superModule + '.' + this.crtClass.superClass;
                }
                else {
                    this.crtClass.superClassFullName = this.crtClass.superClass;
                }
            }
        }
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
        if (ast.value) {
            this.processAST(ast.value);
        }
    };
    TsAnalysor.prototype.processConditionalExpression = function (ast) {
        this.processAST(ast.test);
        this.processAST(ast.consequent);
        this.processAST(ast.alternate);
    };
    TsAnalysor.prototype.processExportNamedDeclaration = function (ast) {
        this.processAST(ast.declaration);
    };
    TsAnalysor.prototype.processExpressionStatement = function (ast) {
        this.processAST(ast.expression);
    };
    TsAnalysor.prototype.processForInStatement = function (ast) {
        this.processAST(ast.left);
        this.processAST(ast.right);
        this.processAST(ast.body);
    };
    TsAnalysor.prototype.processForOfStatement = function (ast) {
        this.processAST(ast.left);
        this.processAST(ast.right);
        this.processAST(ast.body);
    };
    TsAnalysor.prototype.processForStatement = function (ast) {
        if (ast.init)
            this.processAST(ast.init);
        if (ast.test)
            this.processAST(ast.test);
        if (ast.update)
            this.processAST(ast.update);
        this.processAST(ast.body);
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
        // if(this.fullPath.indexOf('WxRoot') >= 0) {
        //     console.log('processFunctionExpression: ', funcName ? funcName : 'no name', ast.params ? ast.params.length : 'no param');
        // }
        if (this.crtClass) {
            if (funcName == this.crtClass.name)
                funcName = 'constructor';
            var funcInfo = new FunctionInfo();
            funcInfo.anoymousFuncCnt = 0;
            funcInfo.accessibility = accessibility;
            funcInfo.static = isStatic;
            funcInfo.className = this.crtClass.name;
            if (this.crtFunc) {
                // 这是函数内的一个匿名函数
                // this.assert(!funcName, ast, 'It should be an anoymous function!');
                this.crtFunc.anoymousFuncCnt++;
                funcInfo.name = this.crtFunc.name + '~' + this.crtFunc.anoymousFuncCnt;
                funcInfo.parentFunc = this.crtFunc;
            }
            else {
                if (!funcName) {
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
            for (var i = 0, len = ast.params.length; i < len; i++) {
                var oneParam = ast.params[i];
                oneParam.__parent = ast;
                oneParam.__isFuncParam = true;
                this.processAST(oneParam);
            }
        }
        if (ast.body)
            this.processAST(ast.body);
        this.crtFunc = this.crtFunc.parentFunc;
    };
    TsAnalysor.prototype.processIdentifier = function (ast) {
        var str = ast.name;
        if (ast.__isFuncParam && this.crtFunc) {
            this.crtFunc.params.push(str);
        }
    };
    TsAnalysor.prototype.processIfStatement = function (ast) {
        this.processAST(ast.test);
        this.processAST(ast.consequent);
        if (ast.alternate && (ast.alternate.type != typescript_estree_1.AST_NODE_TYPES.BlockStatement || ast.alternate.body.length > 0)) {
            this.processAST(ast.alternate);
        }
    };
    TsAnalysor.prototype.processImportDeclaration = function (ast) {
        var sourceValue = ast.source.value;
        var dotPos = sourceValue.lastIndexOf('/');
        var idStr = sourceValue;
        var importModule = '';
        if (dotPos > 0) {
            idStr = sourceValue.substr(dotPos + 1);
            importModule = sourceValue.substring(0, dotPos);
        }
        for (var i = 0, len = ast.specifiers.length; i < len; i++) {
            var ss = this.codeFromAST(ast.specifiers[i]);
            if (ss in this.importedMap)
                continue;
            this.importedMap[ss] = importModule.replace(/\//g, '.');
        }
    };
    TsAnalysor.prototype.processLogicalExpression = function (ast) {
        this.processAST(ast.left);
        this.processAST(ast.right);
    };
    TsAnalysor.prototype.processMemberExpression = function (ast) {
        this.processAST(ast.object);
        this.processAST(ast.property);
    };
    TsAnalysor.prototype.processMethodDefinition = function (ast) {
        var funcName = null;
        if (ast.key) {
            funcName = this.codeFromAST(ast.key);
        }
        this.processFunctionExpressionInternal(funcName, ast.static, ast.kind, ast.accessibility, ast.value);
    };
    TsAnalysor.prototype.processNewExpression = function (ast) {
        this.processAST(ast.callee);
        for (var i = 0, len = ast.arguments.length; i < len; i++) {
            this.processAST(ast.arguments[i]);
        }
    };
    TsAnalysor.prototype.processObjectExpression = function (ast) {
        for (var i = 0, len = ast.properties.length; i < len; i++) {
            this.processAST(ast.properties[i]);
        }
    };
    TsAnalysor.prototype.processObjectPattern = function (ast) {
        this.assert(false, ast, 'Not support ObjectPattern yet!');
    };
    TsAnalysor.prototype.processProgram = function (ast) {
        for (var i = 0, len = ast.body.length; i < len; i++) {
            var stm = ast.body[i];
            this.processAST(stm);
        }
    };
    TsAnalysor.prototype.processProperty = function (ast) {
        this.processAST(ast.key);
        this.processAST(ast.value);
    };
    TsAnalysor.prototype.processReturnStatement = function (ast) {
        if (ast.argument) {
            this.processAST(ast.argument);
        }
    };
    TsAnalysor.prototype.processSequenceExpression = function (ast) {
        for (var i = 0, len = ast.expressions.length; i < len; i++) {
            this.processAST(ast.expressions[i]);
        }
    };
    TsAnalysor.prototype.processSwitchCase = function (ast) {
        if (ast.test) {
            this.processAST(ast.test);
        }
        for (var i = 0, len = ast.consequent.length; i < len; i++) {
            if (ast.consequent[i].type != typescript_estree_1.AST_NODE_TYPES.BreakStatement) {
                this.processAST(ast.consequent[i]);
            }
        }
    };
    TsAnalysor.prototype.processSwitchStatement = function (ast) {
        this.processAST(ast.discriminant);
        for (var i = 0, len = ast.cases.length; i < len; i++) {
            this.processSwitchCase(ast.cases[i]);
        }
    };
    TsAnalysor.prototype.processThrowStatement = function (ast) {
        this.processAST(ast.argument);
    };
    TsAnalysor.prototype.processTryStatement = function (ast) {
        this.processAST(ast.block);
        if (ast.handler) {
            this.processAST(ast.handler);
        }
        if (ast.finalizer) {
            this.processAST(ast.finalizer);
        }
    };
    TsAnalysor.prototype.processUnaryExpression = function (ast) {
        this.processAST(ast.argument);
    };
    TsAnalysor.prototype.processUpdateExpression = function (ast) {
        this.processAST(ast.argument);
    };
    TsAnalysor.prototype.processVariableDeclaration = function (ast) {
        for (var i = 0, len = ast.declarations.length; i < len; i++) {
            var d = ast.declarations[i];
            this.processVariableDeclarator(d);
        }
    };
    TsAnalysor.prototype.processVariableDeclarator = function (ast) {
        this.processAST(ast.id);
        if (ast.init) {
            this.processAST(ast.init);
        }
    };
    TsAnalysor.prototype.processWhileStatement = function (ast) {
        this.processAST(ast.test);
        this.processAST(ast.body);
    };
    TsAnalysor.prototype.processTSInterfaceBody = function (ast) {
        for (var i = 0, len = ast.body.length; i < len; i++) {
            this.codeFromAST(ast.body[i]);
        }
    };
    TsAnalysor.prototype.processTSAbstractMethodDefinition = function (ast) {
        this.processMethodDefinition(ast);
    };
    TsAnalysor.prototype.processTSModuleBlock = function (ast) {
        for (var i = 0, len = ast.body.length; i < len; i++) {
            this.processAST(ast.body[i]);
        }
        this.crtModule = null;
    };
    TsAnalysor.prototype.processTSModuleDeclaration = function (ast) {
        var mid = this.codeFromAST(ast.id);
        if ('_EMPTYMODULE_' == mid) {
            this.crtModule = '';
        }
        else {
            if (this.crtModule) {
                this.crtModule += '.' + mid;
            }
            else {
                this.crtModule = mid;
            }
        }
        this.processAST(ast.body);
    };
    TsAnalysor.prototype.processTSImportEqualsDeclaration = function (ast) {
        var idStr = this.codeFromAST(ast.id);
        var refRstr = this.codeFromAST(ast.moduleReference.right);
        if (idStr == refRstr) {
            var refLStr = this.codeFromAST(ast.moduleReference.left);
            this.importedMap[idStr] = refLStr;
        }
    };
    TsAnalysor.prototype.processTSInterfaceDeclaration = function (ast) {
        var className = this.codeFromAST(ast.id);
        this.crtClass = new ClassInfo();
        this.crtClass.name = className;
        this.crtClass.module = this.crtModule || this.fileModule;
        this.crtClass.anoymousFuncCnt = 0;
        this.classNameMap[this.crtClass.name] = this.crtClass;
        this.classFullNameMap[this.crtClass.fullName] = this.crtClass;
    };
    TsAnalysor.prototype.codeFromAST = function (ast) {
        var str = '';
        switch (ast.type) {
            case typescript_estree_1.AST_NODE_TYPES.Identifier:
                str += this.codeFromIdentifier(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.ImportSpecifier:
                str += this.codeFromImportSpecifier(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.MemberExpression:
                str += this.codeFromMemberExpression(ast);
                break;
            case typescript_estree_1.AST_NODE_TYPES.TSQualifiedName:
                str += this.codeFromTSQualifiedName(ast);
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
    TsAnalysor.prototype.codeFromImportSpecifier = function (ast) {
        var str = this.codeFromAST(ast.imported);
        return str;
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
    TsAnalysor.prototype.codeFromTSQualifiedName = function (ast) {
        ast.left;
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
        for (var fullName in this.classFullNameMap) {
            str += this.classFullNameMap[fullName].toString() + '\n';
        }
        return str;
    };
    return TsAnalysor;
}());
exports.TsAnalysor = TsAnalysor;
