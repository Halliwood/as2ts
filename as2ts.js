var arguments = process.argv.splice(2);
go.apply(this, arguments);

function go(asRoot, tsRoot) {
    var esprima = require('esprima'), fs = require('fs'), path = require('path');
    
    var errorMsg, astSaved1, astSaved2;

    // 以下变量不予混淆
    var protectedMap = {};
    // js内置对象
    var jsBuiltIns = ['Array', 'ArrayBuffer', 'AsyncFunction', 'Atomics', 'BigInt', 'Boolean', 'DataView', 'Date', 'Error', 'EvalError', 'Float32Array', 'Float64Array', 'Function', 'Generator', 'GeneratorFunction', 'Infinity', 'Int16Array', 'Int32Array', 'Int8Array', 'InternalError', 'Intl', 'Collator', 'DateTimeFormat', 'NumberFormat', 'PluralRules', 'RelativeTimeFormat', 'JSON', 'Map', 'Math', 'NaN', 'Number', 'Object', 'Promise', 'Proxy', 'RangeError', 'ReferenceError', 'Reflect', 'RegExp', 'Set', 'SharedArrayBuffer', 'String', 'Symbol', 'SyntaxError', 'TypeError', 'TypedArray', 'URIError', 'Uint16Array', 'Uint32Array', 'Uint8Array', 'Uint8ClampedArray', 'WeakMap', 'WeakSet', 'WebAssembly', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', 'eval', 'isFinite', 'isNaN', 'null', 'parseFloat', 'parseInt', 'undefined', 'unescape', 'uneval'];
    for(var i = 0, len = jsBuiltIns.length; i < len; i++) {
        protectedMap[jsBuiltIns[i]] = true;
    }

    // js接口
    var jsBuiltInFuncs = ['abs', 'acos', 'acosh', 'add', 'all', 'anchor', 'and', 'apply', 'asin', 'asinh', 'assign', 'atan', 'atan2', 'atanh', 'big', 'bind', 'blink', 'bold', 'call', 'catch', 'cbrt', 'ceil', 'charAt', 'charCodeAt', 'clear', 'clz32', 'codePointAt', 'compareExchange', 'compile', 'compileStreaming', 'concat', 'construct', 'copyWithin', 'cos', 'cosh', 'create', 'customSections', 'defineProperties', 'defineProperty', 'delete', 'deleteProperty', 'endsWith', 'entries', 'enumerate', 'eval', 'every', 'exchange', 'exec', 'exp', 'expm1', 'exports', 'fill', 'filter', 'finally', 'find', 'findIndex', 'fixed', 'flat', 'flatMap', 'floor', 'fontcolor', 'fontsize', 'for', 'forEach', 'formatToParts', 'freeze', 'from', 'fromCharCode', 'fromCodePoint', 'fromEntries', 'fround', 'get', 'accessor', 'property', 'returns', 'the', 'Array', 'getCanonicalLocales', 'getDate', 'getDay', 'getFloat32', 'getFloat64', 'getFullYear', 'getHours', 'getInt16', 'getInt32', 'getInt8', 'getMilliseconds', 'getMinutes', 'getMonth', 'getNotifier', 'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors', 'getOwnPropertyNames', 'getOwnPropertySymbols', 'getPrototypeOf', 'getSeconds', 'getTime', 'getTimezoneOffset', 'getUTCDate', 'getUTCDay', 'getUTCFullYear', 'getUTCHours', 'getUTCMilliseconds', 'getUTCMinutes', 'getUTCMonth', 'getUTCSeconds', 'getUint16', 'getUint32', 'getUint8', 'getVarDate', 'getYear', 'grow', 'has', 'hasOwnProperty', 'hypot', 'Indexed', 'collections', 'This', 'chapter', 'introduces', 'collections', 'of', 'data', 'which', 'are', 'ordered', 'by', 'an', 'index', 'This', 'includes', 'arrays', 'and', 'array'-'like', 'constructs', 'such', 'as', 'Array', 'objects', 'and', 'TypedArray', 'imports', 'imul', 'includes', 'indexOf', 'instantiate', 'instantiateStreaming', 'is', 'isArray', 'isExtensible', 'isFinite', 'isFrozen', 'isGenerator', 'isInteger', 'isLockFree', 'isNaN', 'isPrototypeOf', 'isSafeInteger', 'isSealed', 'isView', 'italics', 'join', 'keyFor', 'keys', 'lastIndexOf', 'link', 'load', 'localeCompare', 'log', 'log10', 'log1p', 'log2', 'map', 'match', 'max', 'min', 'move', 'next', 'normalize', 'notify', 'now', 'observe', 'of', 'or', 'ownKeys', 'padEnd', 'padStart', 'parse', 'parseFloat', 'parseInt', 'pop', 'pow', 'preventExtensions', 'propertyIsEnumerable', 'method', 'returns', 'a', 'new', 'Iterator', 'object', 'that', 'iterates', 'over', 'the', 'code', 'points', 'of', 'a', 'String', 'value', 'returning', 'each', 'code', 'point', 'as', 'a', 'String', 'method', 'retrieves', 'the', 'matches', 'when', 'matching', 'a', 'string', 'against', 'a', 'regular', 'method', 'replaces', 'some', 'or', 'all', 'matches', 'of', 'a', 'this', 'pattern', 'in', 'a', 'string', 'by', 'a', 'replacement', 'and', 'returns', 'the', 'result', 'of', 'the', 'replacement', 'as', 'a', 'new', 'The', 'replacement', 'can', 'be', 'a', 'string', 'or', 'a', 'function', 'to', 'be', 'called', 'for', 'each', 'method', 'executes', 'a', 'search', 'for', 'a', 'match', 'between', 'a', 'this', 'regular', 'expression', 'and', 'a', 'method', 'splits', 'a', 'String', 'object', 'into', 'an', 'array', 'of', 'strings', 'by', 'separating', 'the', 'string', 'into', 'method', 'converts', 'a', 'Date', 'object', 'to', 'a', 'primitive', 'method', 'converts', 'a', 'Symbol', 'object', 'to', 'a', 'primitive', 'push', 'quote', 'race', 'random', 'raw', 'reduce', 'reduceRight', 'reject', 'repeat', 'replace', 'resolve', 'resolvedOptions', 'return', 'reverse', 'revocable', 'round', 'ScriptEngine', 'seal', 'search', 'select', 'set', 'setDate', 'setFloat32', 'setFloat64', 'setFullYear', 'setHours', 'setInt16', 'setInt32', 'setInt8', 'setMilliseconds', 'setMinutes', 'setMonth', 'setPrototypeOf', 'setSeconds', 'setTime', 'setUTCDate', 'setUTCFullYear', 'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes', 'setUTCMonth', 'setUTCSeconds', 'setUint16', 'setUint32', 'setUint8', 'setYear', 'shift', 'sign', 'sin', 'sinh', 'slice', 'small', 'some', 'sort', 'splice', 'split', 'sqrt', 'startsWith', 'store', 'strike', 'stringify', 'sub', 'subarray', 'substr', 'substring', 'sup', 'supportedLocalesOf', 'tan', 'tanh', 'test', 'then', 'throw', 'toDateString', 'toExponential', 'toFixed', 'toGMTString', 'toISOString', 'toInteger', 'toJSON', 'toLocaleDateString', 'toLocaleFormat', 'toLocaleLowerCase', 'toLocaleString', 'toLocaleTimeString', 'toLocaleUpperCase', 'toLowerCase', 'toPrecision', 'toSource', 'toString', 'toTimeString', 'toUTCString', 'toUpperCase', 'transfer', 'trim', 'trimEnd', 'trimStart', 'trunc', 'UTC', 'unobserve', 'unshift', 'unwatch', 'validate', 'valueOf', 'values', 'wait', 'watch', 'writeln', 'xor'];
    for(var i = 0, len = jsBuiltInFuncs.length; i < len; i++) {
        protectedMap[jsBuiltInFuncs[i]] = true;
    }

    // js保留关键字
    var jsKeyWords = ['abstract', 'arguments', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'double', 'else', 'enum', 'eval', 'export', 'extends', 'false', 'final', 'finally', 'float', 'for', 'function', 'goto', 'if', 'implements', 'import', 'in', 'instanceof', 'int', 'interface', 'let', 'long', 'native', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while', 'with', 'yield', 'Array', 'Date', 'eval', 'function', 'hasOwnProperty', 'Infinity', 'isFinite', 'isNaN', 'isPrototypeOf', 'length', 'Math', 'NaN', 'name', 'Number', 'Object', 'prototype', 'String', 'toString', 'undefined', 'valueOf', 'getClass', 'java', 'JavaArray', 'javaClass', 'JavaObject', 'JavaPackage', 'alert', 'all', 'anchor', 'anchors', 'area', 'assign', 'blur', 'button', 'checkbox', 'clearInterval', 'clearTimeout', 'clientInformation', 'close', 'closed', 'confirm', 'constructor', 'crypto', 'decodeURI', 'decodeURIComponent', 'defaultStatus', 'document', 'element', 'elements', 'embed', 'embeds', 'encodeURI', 'encodeURIComponent', 'escape', 'event', 'fileUpload', 'focus', 'form', 'forms', 'frame', 'innerHeight', 'innerWidth', 'layer', 'layers', 'link', 'location', 'mimeTypes', 'navigate', 'navigator', 'frames', 'frameRate', 'hidden', 'history', 'image', 'images', 'offscreenBuffering', 'open', 'opener', 'option', 'outerHeight', 'outerWidth', 'packages', 'pageXOffset', 'pageYOffset', 'parent', 'parseFloat', 'parseInt', 'password', 'pkcs11', 'plugin', 'prompt', 'propertyIsEnum', 'radio', 'reset', 'screenX', 'screenY', 'scroll', 'secure', 'select', 'self', 'setInterval', 'setTimeout', 'status', 'submit', 'taint', 'text', 'textarea', 'top', 'unescape', 'untaint', 'window', 'onblur', 'onclick', 'onerror', 'onfocus', 'onkeydown', 'onkeypress', 'onkeyup', 'onmouseover', 'onload', 'onmouseup', 'onmousedown', 'onsubmit'];
    for(var i = 0, len = jsKeyWords.length; i < len; i++) {
        protectedMap[jsKeyWords[i]] = true;
    }
        
    // 运算符优先级
    var pv = 0;
    const operatorPriorityMap = {};
    setPriority(['( … )'], pv++);
    setPriority(['… . …', '… [ … ]', 'new … ( … )', '… ( … )'], pv++);
    setPriority(['new …'], pv++);
    setPriority(['… ++', '… --'], pv++);
    setPriority(['! …', '~ …', '+ …', '- …', '++ …', '-- …', 'typeof …', 'void …', 'delete …', 'await …'], pv++);
    setPriority(['… ** …'], pv++);
    setPriority(['… * …', '… / …', '… % …'], pv++);
    setPriority(['… + …', '… - …'], pv++);
    setPriority(['… << …', '… >> …', '… >>> …'], pv++);
    setPriority(['… < …', '… <= …', '… > …', '… >= …', '… in …', '… instanceof …'], pv++);
    setPriority(['… == …', '… != …', '… === …', '… !== …'], pv++);
    setPriority(['… & …'], pv++);
    setPriority(['… ^ …'], pv++);
    setPriority(['… | …'], pv++);
    setPriority(['… && …'], pv++);
    setPriority(['… || …'], pv++);
    setPriority(['… ? … : …'], pv++);
    setPriority(['… = …', '… += …', '… -= …', '… *= …', '… /= …', '… %= …', '… <<= …', '… >>= …', '… >>>= …', '… &= …', '… ^= …', '… |= …'], pv++);
    setPriority(['yield …', 'yield* …'], pv++);
    setPriority(['...'], pv++);
    setPriority(['… , …'], pv++);
        
    function setPriority(keys, value) {
        for(var i = 0, len = keys.length; i < len; i++) {
            operatorPriorityMap[keys[i]] = value;
        }
    }
        
    const noBraceTypes = ['MemberExpression', 'ThisExpression', 'Identifier'];
    
    var astArr = [];
    var formatNewLine = '\n';
    
    for(var i = 0, len = rootJsPaths.length; i < len; i++) {        
        var rootJsPath = rootJsPaths[i];
        fs.copyFileSync(rootJsPath, workFolder + i + '.js');
        log('parsing syntax tree: ' + rootJsPath + '...');
        st = et;
        var data = fs.readFileSync(rootJsPath, 'utf8');        
        var ast = esprima.parseScript(data);
        astArr.push(ast);
        et = (new Date()).getTime();
        log('parsing syntax tree finished, ' + (et - st) + 'ms costed. ');
        
        log('modifying syntax tree...');
        st = et;
        processAST(ast);
        et = (new Date()).getTime();
        log('modifying syntax tree finished, ' + (et - st) + 'ms costed. ');
        
        log('marking laya classes...');
        st = et;
        markLayaClasses(ast);
        et = (new Date()).getTime();
        log('laya classes marked, ' + (et - st) + 'ms costed. ');
    }
        
    st = (new Date()).getTime();
    log('building ugly pool...');
    buildUglyPool();
    et = (new Date()).getTime();
    log('building ugly pool finished, ' + (et - st) + 'ms costed. ');
    
    var jslibFileNames = [];
    var nextJslibIdx = 0;
    var jslibPath = __dirname + '/jscode';
    var jslibFiles = fs.readdirSync(jslibPath);
    jslibFiles.forEach(function(filename){
        jslibFileNames.push(filename);
    });
        
    for(var i = 0, len = rootJsPaths.length; i < len; i++) {        
        var rootJsPath = rootJsPaths[i];
        st = et;
        log('building ugly code....');
        var ast = astArr[i];
        
        var uglyCode = codeFromAST(ast);
        et = (new Date()).getTime();
        log('ugly code generated, ' + (et - st) + 'ms costed. ');
        
        st = et;
        var saveJsPath = rootJsPath;
        if(!replaceIt) {
            saveJsPath = rootJsPath.replace(/\.as$/, '.ts');
        }
        log('saving ugly code as ' + saveJsPath + '....');        
        fs.writeFileSync(saveJsPath, uglyCode);
        
        et = (new Date()).getTime();
        log('ugly code saved, ' + (et - st) + 'ms costed. ');
    }
    
    checkDisplayError();
    log('total cost ' + (et - startAt) + 'ms. ');
    
    fs.writeFileSync(workFolder + 'log' + st + '.txt', logContent);
        
    function astToSimpleString(ast) {
        var str = '';
        if(ast instanceof Object) {
            for(var key in ast) {
                if(key.indexOf('__') != 0) {
                    str += key + ':' + astToSimpleString(ast[key]) + ';';
                }                
            }
        } else {
            str = '' + ast;
        }
        return str + '\n';
    }

    function markLayaClasses(ast) {
        for(var key in ast) {
            var sast = ast[key];
            if(sast instanceof Object) {
                if(ast.__protectedClass) {
                    sast.__protectedClass = ast.__protectedClass;
                }
                markLayaClasses(sast);
            }
        }
        if(ast.__protectedClass && ast.type == 'Identifier') {
            protectedMap[ast.name] = true;
        }
    }

    // 修改语法树
    function processAST(ast) {
        switch(ast.type) {
            case 'Node':
                processNode(ast);
                break;
            case 'Identifier':
                processIdentifier(ast);
                break;
            case 'Literal':
                processLiteral(ast);
                break;
            case 'RegExpLiteral':
                processRegExpLiteral(ast);
                break;
            case 'Program':
                processProgram(ast);
                break;
            case 'Function':
                processFunction(ast);
                break;
            case 'ExpressionStatement':
                processExpressionStatement(ast);
                break;
            case 'Directive':
                processDirective(ast);
                break;
            case 'BlockStatement':
                processBlockStatement(ast);
                break;
            case 'FunctionBody':
                processFunctionBody(ast);
                break;
            case 'EmptyStatement':
                processEmptyStatement(ast);
                break;
            case 'DebuggerStatement':
                processDebuggerStatement(ast);
                break;
            case 'WithStatement':
                processWithStatement(ast);
                break;
            case 'ReturnStatement':
                processReturnStatement(ast);
                break;
            case 'LabeledStatement':
                processLabeledStatement(ast);
                break;
            case 'BreakStatement':
                processBreakStatement(ast);
                break;
            case 'ContinueStatement':
                processContinueStatement(ast);
                break;
            case 'IfStatement':
                processIfStatement(ast);
                break;
            case 'SwitchStatement':
                processSwitchStatement(ast);
                break;
            case 'SwitchCase':
                processSwitchCase(ast);
                break;
            case 'ThrowStatement':
                processThrowStatement(ast);
                break;
            case 'TryStatement':
                processTryStatement(ast);
                break;
            case 'CatchClause':
                processCatchClause(ast);
                break;
            case 'WhileStatement':
                processWhileStatement(ast);
                break;
            case 'DoWhileStatement':
                processDoWhileStatement(ast);
                break;
            case 'ForStatement':
                processForStatement(ast);
                break;
            case 'ForInStatement':
                processForInStatement(ast);
                break;
            case 'FunctionDeclaration':
                processFunctionDeclaration(ast);
                break;
            case 'VariableDeclaration':
                processVariableDeclaration(ast);
                break;
            case 'VariableDeclarator':
                processVariableDeclarator(ast);
                break;
            case 'ThisExpression':
                processThisExpression(ast);
                break;
            case 'ArrayExpression':
                processArrayExpression(ast);
                break;
            case 'ObjectExpression':
                processObjectExpression(ast);
                break;
            case 'Property':
                processProperty(ast);
                break;
            case 'FunctionExpression':
                processFunctionExpression(ast);
                break;
            case 'UnaryExpression':
                processUnaryExpression(ast);
                break;
            case 'UnaryOperator':
                processUnaryOperator(ast);
                break;
            case 'UpdateExpression':
                processUpdateExpression(ast);
                break;
            case 'UpdateOperator':
                processUpdateOperator(ast);
                break;
            case 'BinaryExpression':
                processBinaryExpression(ast);
                break;
            case 'BinaryOperator':
                processBinaryOperator(ast);
                break;
            case 'AssignmentExpression':
                processAssignmentExpression(ast);
                break;
            case 'AssignmentOperator':
                processAssignmentOperator(ast);
                break;
            case 'LogicalExpression':
                processLogicalExpression(ast);
                break;
            case 'LogicalOperator':
                processLogicalOperator(ast);
                break;
            case 'MemberExpression':
                processMemberExpression(ast);
                break;
            case 'ConditionalExpression':
                processConditionalExpression(ast);
                break;
            case 'CallExpression':
                processCallExpression(ast);
                break;
            case 'NewExpression':
                processNewExpression(ast);
                break;
            case 'SequenceExpression':
                processSequenceExpression(ast);
                break;
            default:
                console.error('ERROR: unknown syntax type: ' + ast.type);
                throw new Error('ERROR: unknown syntax type: ' + ast.type);
                break;
        }
    }

    function processNode(ast) {
        // do nothing...
    }

    function processIdentifier(ast) {
        if(ast.name.length <= noUglyShortest) {
            savedIDMap[ast.name] = 1;
        }
    }

    function processLiteral(ast) {
        if(typeof(ast.value) == 'string' && !ast.__packageName) {
            // 字符串类型的不予混淆
            noUglyMap[ast.value] = true;
        }
    }

    function processRegExpLiteral(ast) {
        // do nothing...
    }

    function processProgram(pgm) {
        if(pgm.body instanceof Array) {
            for(var i in pgm.body) {
                processAST(pgm.body[i]);
            }
        } else {
            processAST(pgm.body);
        }
    }

    function processFunction(ast) {
        if(ast.id) {
            ast.id.__functionName = true;
            processAST(ast.id);
        }
        if(ast.params) {
            for(var i = 0, len = ast.params.length; i < len; i ++) {
                processAST(ast.params[i]);
            }
        }
        processAST(ast.body);
        if(ast.body.__protectedClass) {
            ast.__protectedClass = ast.body.__protectedClass;
            ast.__protectedClassLv = ast.body.__protectedClassLv + 1;
        }
    }

    function processExpressionStatement(ast) {
        processAST(ast.expression);
        if(ast.expression.__protectedClass) {
            ast.__protectedClass = ast.expression.__protectedClass;
            ast.__protectedClassLv = ast.expression.__protectedClassLv + 1;
        }
    }

    function processDirective(ast) {
        console.error('ERROR: processDirective');
        processLiteral(ast.expression);
    }

    function processBlockStatement(ast) {
        for(var i = 0, len = ast.body.length; i < len; i++) {
            var b = ast.body[i];
            processAST(b);
            if(b.__protectedClass && b.__protectedClassLv < protectedClassMaxLv) {
                ast.__protectedClass = b.__protectedClass;
                ast.__protectedClassLv = b.__protectedClassLv + 1;
            }
        }
    }

    function processFunctionBody(ast) {
        processAST(ast);
    }

    function processEmptyStatement(ast) {
        // do nothing...
    }

    function processDebuggerStatement(ast) {
        // do nothing...
    }

    function processWithStatement(ast) {
        processAST(ast.object);
        processAST(ast.body);
    }

    function processReturnStatement(ast) {
        ast.argument && processAST(ast.argument); 
    }

    function processLabeledStatement(ast) {
        processAST(ast.label);
        processAST(ast.body);
    }

    function processBreakStatement(ast) {
        ast.label && processAST(ast.label);
    }

    function processContinueStatement(ast) {
        ast.label && processAST(ast.label);
    }

    function processIfStatement(ast) {
        processAST(ast.test);
        processAST(ast.consequent);
        if(ast.alternate) {
            processAST(ast.alternate);
        }
    }

    function processSwitchStatement(ast) {
        processAST(ast.discriminant);
        for(var i = 0, len = ast.cases.length; i < len; i++) {
            processSwitchCase(ast.cases[i]);
        }
    }

    function processSwitchCase(ast) {
        ast.test && processAST(ast.test);
        for(var i = 0, len = ast.consequent.length; i < len; i++) {
            processAST(ast.consequent[i]);
        }
    }

    function processThrowStatement(ast) {
        processAST(ast.argument);
    }

    function processTryStatement(ast) {
        processBlockStatement(ast.block);
        ast.handler && processCatchClause(ast.handler);
        ast.finalizer && processBlockStatement(ast.finalizer);
    }

    function processCatchClause(ast) {
        processIdentifier(ast.param);
        processBlockStatement(ast.body);
    }

    function processWhileStatement(ast) {
        processAST(ast.test);
        processAST(ast.body);
    }

    function processDoWhileStatement(ast) {
        processAST(ast.body);
        processAST(ast.test);
    }

    function processForStatement(ast) {
        if(ast.init) {
            processAST(ast.init);
            ast.init.__noRubbish = true;
        }
        if(ast.test) {
            processAST(ast.test);
            ast.test.__noRubbish = true;
        }
        if(ast.update) {
            processAST(ast.update);
            ast.update.__noRubbish = true;
        }
        processAST(ast.body);
    }

    function processForInStatement(ast) {
        processAST(ast.left);
        ast.left.__noRubbish = true;
        processAST(ast.right);
        ast.right.__noRubbish = true;
        processAST(ast.body);
    }

    function processFunctionDeclaration(ast) {
        processFunction(ast);
    }

    function processVariableDeclaration(ast) {        
        var protectedClasses = [];
        var protectedCnt = 0;
        var protectedClassLv = 0;
        for(var i = 0, len = ast.declarations.length; i < len; i++) {
            var d = ast.declarations[i];
            processVariableDeclarator(d);
            if(d.__protectedClass) {
                protectedCnt++;
                if(protectedClasses.indexOf(d.__protectedClass) < 0) {
                    protectedClasses.push(d.__protectedClass);
                    protectedClassLv = d.__protectedClassLv;
                }
            }
        }
        // 以下是为了方便处理将表格结构定义移除
        if(protectedCnt == ast.declarations.length && protectedClasses.length == 1) {
            ast.__protectedClass = protectedClasses[0];
            ast.__protectedClassLv = protectedClassLv + 1;
        }
    }

    function processVariableDeclarator(ast) {
        processIdentifier(ast.id);
        if(ast.init) {
            processAST(ast.init);
            if(ast.init.__protectedClass) {
                // log('get laya class for declarator: ' + ast.init.__protectedClass);
                ast.__protectedClass = ast.init.__protectedClass;
                ast.__protectedClassLv = ast.init.__protectedClassLv + 1;
            }
        }
    }

    function processThisExpression(ast) {
        // do nothing...
    }

    function processArrayExpression(ast) {
        for(var i = 0, len = ast.elements.length; i < len; i++) {
            var e = ast.elements[i];
            if(e) {
                processAST(e);
            }
        }
    }

    function processObjectExpression(ast) {
        for(var i = 0, len = ast.properties.length; i < len; i++) {
            processAST(ast.properties[i]);
        }
    }

    function processProperty(ast) {
        processAST(ast.key);
        processAST(ast.value);
    }

    function processFunctionExpression(ast) {
        processFunction(ast);
    }

    function processUnaryExpression(ast) {
        ast.__calPriority = getCalPriority(ast.prefix ? ast.operator + ' …' : '… ' + ast.operator);
        processUnaryOperator(ast.operator);
        processAST(ast.argument);
    }

    function processUnaryOperator(ast) {
        // do nothing...        
    }

    function processUpdateExpression(ast) {
        ast.__calPriority = getCalPriority(ast.prefix ? ast.operator + ' …' : '… ' + ast.operator);
        processUpdateOperator(ast.operator);
        processAST(ast.argument);
    }

    function processUpdateOperator(ast) {
        // do nothing...        
    }

    function processBinaryExpression(ast) {
        ast.__calPriority = getCalPriority('… ' + ast.operator + ' …');
        processBinaryOperator(ast.operator);
        processAST(ast.left);
        processAST(ast.right);
    }

    function processBinaryOperator(ast) {
        // do nothing...        
    }

    function processAssignmentExpression(ast) {
        ast.__calPriority = getCalPriority('… ' + ast.operator + ' …');
        processAssignmentOperator(ast.operator);
        processAST(ast.left);
        processAST(ast.right);
        if(ast.left.__kw_or_macros && ast.right.type == 'Literal') {
            ast.__trash = true;
        }
    }

    function processAssignmentOperator(ast) {
        // do nothing...    
    }

    function processLogicalExpression(ast) {
        ast.__calPriority = getCalPriority('… ' + ast.operator + ' …');
        processLogicalOperator(ast.operator);
        processAST(ast.left);
        processAST(ast.right);
    }

    function processLogicalOperator(ast) {
        // do nothing...    
    }

    function processMemberExpression(ast) {
        ast.__calPriority = getCalPriority(ast.computed ? '… [ … ]' : '… . …');        
        processAST(ast.object);
        processAST(ast.property);
        
        // 需在处理完object和property后判断
        if(ast.property.type == 'Identifier') {            
            if(/^_\$[sg]et_/.test(ast.property.name)) {
                // _$get_/_$set_不混淆，否则拿不到对应的属性
                ast.property.__noUgly = true;    
            }
            if(ast.object.type == 'Identifier' && (ast.object.name == 'KW' || ast.object.name == 'Macros')) {
                // KW和Macros的静态变量不混淆，太多了耗
                ast.property.__noUgly = true;      
                ast.__kw_or_macros = true;
            }            
            if(ast.object.type == 'Identifier' && stopUglyMap[ast.object.name]) {
                // window相关的也不混淆，window.xxx.yyy.zzz的情况，设置window.xxx.yyy from window
                ast.property.__fromWindow = true;
                ast.__fromWindow = true;
            }
            if(stopUglyMap[ast.property.name]) {
                ast.__fromWindow = true;
            }
            if(ast.object.type == 'MemberExpression' && ast.object.__fromWindow) {
                // window相关的也不混淆，window.xxx.yyy.zzz的情况，设置window.xxx.yyy.zzz和zzz from window
                ast.property.__fromWindow = true;
                ast.__fromWindow = true;
            }
        } 
    }

    function processConditionalExpression(ast) {
        ast.__calPriority = getCalPriority('… ? … : …');
        processAST(ast.test);
        processAST(ast.alternate);
        processAST(ast.consequent);
    }

    function processCallExpression(ast) {
        ast.__calPriority = getCalPriority('… ( … )');
        ast.callee.__functionName = true;
        // 需在process子节点前判断是否laya class
        if(ast.callee.type == 'Identifier' && 
        ast.arguments.length >= 2 && ast.arguments.length <= 4 && 
        ast.arguments[0].type == 'Identifier' && ast.arguments[1].type == 'Literal' && typeof ast.arguments[1].value == 'string' && 
        /^(\w+\.)*\w+/.test(ast.arguments[1].value)) {
            // _class的第2个参数是包路径，不予混淆
            var packageName = ast.arguments[1].value;
            ast.arguments[1].__packageName = packageName;
            const notProtected = ['laya.utils.Byte', 'laya.utils.Handler'];
            if(notProtected.indexOf(packageName) < 0) {
                var pa = packageName.split('.');
                // laya相关的类均不混淆，配置结构和Plat也不混淆，避免平台接口被混掉
                if(pa[0] == 'laya' || pa[0] == 'PathFinding' || /subpackage\.system\.game\./.test(packageName)) {
                    ast.callee.__protectedClass = packageName;
                    ast.callee.__protectedClassLv = 0;
                    for(var i = 0, len = pa.length; i < len; i++) {
                        noUglyMap[pa[i]] = true;
                    }
                }
            }
        }        
        processAST(ast.callee);
        for(var i = 0, len = ast.arguments.length; i < len; i++) {
            processAST(ast.arguments[i]);
        }
        if(ast.callee.__protectedClass) {
            // log('get laya class for CallExpression: ' + ast.callee.__protectedClass);
            ast.__protectedClass = ast.callee.__protectedClass;
            ast.__protectedClassLv = ast.callee.__protectedClassLv + 1;
        }
    }

    function processNewExpression(ast) {
        // 由于表格结构会被删除，此处要检查是否new一个表格结构
        // if(ast.callee.type == 'Identifier' && cfgClassNameMap[ast.callee.name]) {
            // throw new Error('try to new a cfg: ' + ast.callee.name);
        // }
        if(ast.arguments.length > 0) {
            ast.__calPriority = getCalPriority('new … ( … )');
        } else {
            ast.__calPriority = getCalPriority('new …');
        }
        processAST(ast.callee);
        for(var i = 0, len = ast.arguments.length; i < len; i++) {
            processAST(ast.arguments[i]);
        }
    }

    function processSequenceExpression(ast) {
        ast.__calPriority = getCalPriority('… , …');
        for(var i = 0, len = ast.expressions.length; i < len; i++) {
            processAST(ast.expressions[i]);
        }
    }

    function buildUglyPool() {
        var ltrnum = ltr.concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var ltrnumLen = ltrnum.length;
        for(var i = 0, ltrLen = ltr.length; i < ltrLen; i++) {
            var s = ltr[i];
            for(var j = 0; j < ltrnumLen; j++) {
                var u = s + ltrnum[j];
                if(!protectedMap[u] && !recordMap[u] && !savedIDMap[u]) {
                    uglyPool.push(u);
                }
                for(var k = 0; k < ltrnumLen; k++) {
                    var uk = u + ltrnum[k];
                    if(!protectedMap[uk] && !recordMap[uk] && !savedIDMap[uk]) {
                        uglyPool.push(uk);
                    }
                    // for(var m = 0; m < ltrnumLen; m++) {
                        // var ukm = uk + ltrnum[m];
                        // if(!protectedMap[ukm] && !recordMap[ukm] && !savedIDMap[ukm]) {
                            // uglyPool.push(ukm);
                        // }
                    // }
                }
            }
        }
        log('uglyPool size: ' + uglyPool.length);
    }

    function toUgly(raw, force) {
        if((!confuseMode && !force) || noUglyMap[raw] || protectedMap[raw] || raw.length < noUglyShortest) {
            return raw;
        }
        var u = uglyMap[raw];
        if(!u) {
            var plen = uglyPool.length;
            if(plen > 0) {
                var idx = Math.floor(Math.random() * plen);
                u = uglyPool[idx];
                uglyPool.splice(idx, 1);
            } else {
                console.error('ERROR: ugly pool run out: ' + raw);
                throw new Error('ERROR: ugly pool run out: ' + raw);
                // process.exit(1);
                u = raw;
            }
            uglyMap[raw] = u;
        }
        return u;
    }

    // 根据语法树生成代码
    function codeFromAST(ast) {
        if(!ast) {
            throw new Error('Cannot generate coude from undefined!');
        }
        // 微信子包会有这些引用，先不去除
        // if(cfgPkgRe.test(ast.__protectedClass)){
            // return '';
        // }

        if(ast.__trash) return '';
        
        var code = '';
        switch(ast.type) {
            case 'Identifier':
                code = codeFromIdentifier(ast);
                break;
            case 'Literal':
                code = codeFromLiteral(ast);
                break;
            case 'RegExpLiteral':
                code = codeFromRegExpLiteral(ast);
                break;
            case 'Program':
                code = codeFromProgram(ast);
                break;
            case 'Function':
                code = codeFromFunction(ast);
                break;
            case 'ExpressionStatement':
                code = codeFromExpressionStatement(ast);
                break;
            case 'Directive':
                code = codeFromDirective(ast);
                break;
            case 'BlockStatement':
                code = codeFromBlockStatement(ast);
                break;
            case 'FunctionBody':
                code = codeFromFunctionBody(ast);
                break;
            case 'EmptyStatement':
                code = codeFromEmptyStatement(ast);
                break;
            case 'DebuggerStatement':
                code = codeFromDebuggerStatement(ast);
                break;
            case 'WithStatement':
                code = codeFromWithStatement(ast);
                break;
            case 'ReturnStatement':
                code = codeFromReturnStatement(ast);
                break;
            case 'LabeledStatement':
                code = codeFromLabeledStatement(ast);
                break;
            case 'BreakStatement':
                code = codeFromBreakStatement(ast);
                break;
            case 'ContinueStatement':
                code = codeFromContinueStatement(ast);
                break;
            case 'IfStatement':
                code = codeFromIfStatement(ast);
                break;
            case 'SwitchStatement':
                code = codeFromSwitchStatement(ast);
                break;
            case 'SwitchCase':
                code = codeFromSwitchCase(ast);
                break;
            case 'ThrowStatement':
                code = codeFromThrowStatement(ast);
                break;
            case 'TryStatement':
                code = codeFromTryStatement(ast);
                break;
            case 'CatchClause':
                code = codeFromCatchClause(ast);
                break;
            case 'WhileStatement':
                code = codeFromWhileStatement(ast);
                break;
            case 'DoWhileStatement':
                code = codeFromDoWhileStatement(ast);
                break;
            case 'ForStatement':
                code = codeFromForStatement(ast);
                break;
            case 'ForInStatement':
                code = codeFromForInStatement(ast);
                break;
            case 'FunctionDeclaration':
                code = codeFromFunctionDeclaration(ast);
                break;
            case 'VariableDeclaration':
                code = codeFromVariableDeclaration(ast);
                break;
            case 'VariableDeclarator':
                code = codeFromVariableDeclarator(ast);
                break;
            case 'ThisExpression':
                code = codeFromThisExpression(ast);
                break;
            case 'ArrayExpression':
                code = codeFromArrayExpression(ast);
                break;
            case 'ObjectExpression':
                code = codeFromObjectExpression(ast);
                break;
            case 'Property':
                code = codeFromProperty(ast);
                break;
            case 'FunctionExpression':
                code = codeFromFunctionExpression(ast);
                break;
            case 'UnaryExpression':
                code = codeFromUnaryExpression(ast);
                break;
            case 'UnaryOperator':
                code = codeFromUnaryOperator(ast);
                break;
            case 'UpdateExpression':
                code = codeFromUpdateExpression(ast);
                break;
            case 'UpdateOperator':
                code = codeFromUpdateOperator(ast);
                break;
            case 'BinaryExpression':
                code = codeFromBinaryExpression(ast);
                break;
            case 'BinaryOperator':
                code = codeFromBinaryOperator(ast);
                break;
            case 'AssignmentExpression':
                code = codeFromAssignmentExpression(ast);
                break;
            case 'AssignmentOperator':
                code = codeFromAssignmentOperator(ast);
                break;
            case 'LogicalExpression':
                code = codeFromLogicalExpression(ast);
                break;
            case 'LogicalOperator':
                code = codeFromLogicalOperator(ast);
                break;
            case 'MemberExpression':
                code = codeFromMemberExpression(ast);
                break;
            case 'ConditionalExpression':
                code = codeFromConditionalExpression(ast);
                break;
            case 'CallExpression':
                code = codeFromCallExpression(ast);
                break;
            case 'NewExpression':
                code = codeFromNewExpression(ast);
                break;
            case 'SequenceExpression':
                code = codeFromSequenceExpression(ast);
                break;
            default:
                console.error('ERROR: unknown syntax type: ' + JSON.stringify(ast));
                throw new Error('ERROR: unknown syntax type: ' + ast.type);
                break;
        }
        return code;
    }

    function codeFromIdentifier(ast) {
        if(!ast.__noUgly && !ast.__fromWindow && !ast.__uglyed) {
            ast.name = toUgly(ast.name);
            ast.__uglyed = true;
        }
        return ast.name;
    }

    function codeFromLiteral(ast) {
        if(ast.regex) {
            // 正则
            return codeFromRegExpLiteral(ast);
        }
        if(ast.__packageName) {
            // 包名拆解后混淆
            var out = '';
            var packageNameArr = ast.value.split('.');
            for(var i = 0, len = packageNameArr.length; i < len; i++) {
                if('' != out) {
                    out += '.';
                }
                out += toUgly(packageNameArr[i]);
            }
            return '\'' + out + '\'';
        }
        return ast.raw;
    }

    function codeFromRegExpLiteral(ast) {
        return '/' + ast.regex.pattern + '/' + ast.regex.flags;
    }

    function codeFromProgram(pgm) {
        var code = '';
        if(pgm.body instanceof Array) {
            for(var i = 0, len = pgm.body.length; i < len; i++) {
                code += codeFromAST(pgm.body[i]);
                if(i < len - 1) {
                    code += formatNewLine;
                }
            }
        } else {
            code += codeFromAST(pgm.body);
        }
        return code;
    }

    function codeFromFunction(ast) {
        var code = 'function';
        if(ast.id) {
            code += ' '+ codeFromAST(ast.id);
        }
        code += '(';
        if(ast.params) {
            for(var i = 0, len = ast.params.length; i < len; i ++) {
                code += codeFromAST(ast.params[i]);
                if(i < len - 1) {
                    code += ','
                }
            }
        }
        code += ')';
        var bodyCode = codeFromAST(ast.body);
        if(ast.body.type != 'BlockStatement') {
            bodyCode = '{' + formatNewLine + bodyCode + formatNewLine + '}';
        }
        code += bodyCode;
        return code + formatNewLine;
    }

    function codeFromExpressionStatement(ast) {
        return codeFromAST(ast.expression) + ';';
    }

    function codeFromDirective(ast) {
        console.error('ERROR: codeFromDirective');
    }

    function codeFromBlockStatement(ast) {
        var code = '{';
        for(var i = 0, len = ast.body.length; i < len; i++) {
            var t = codeFromAST(ast.body[i]);
            code += t;
            code += formatNewLine;
        }
        code += '}';
        return code;
    }

    function codeFromEmptyStatement(ast) {
        return ';';
    }

    function codeFromDebuggerStatement(ast) {
        return 'debugger;';
    }

    function codeFromWithStatement(ast) {
        var code = 'with(' + codeFromAST(ast.object) + ')';
        var bodyCode = codeFromAST(ast.body);
        if(ast.body.type != 'BlockStatement') {
            bodyCode = '{' + formatNewLine + bodyCode + formatNewLine + '}';
        }
        code += bodyCode;
        return code + formatNewLine;
    }

    function codeFromReturnStatement(ast) {
        var code = 'return';
        if(ast.argument) {
            code += ' ' + codeFromAST(ast.argument); 
        }
        return code + ';' + formatNewLine;
    }

    function codeFromLabeledStatement(ast) {
        console.error('ERROR: codeFromLabeledStatement');
        codeFromAST(ast.label);
        codeFromAST(ast.body);
    }

    function codeFromBreakStatement(ast) {
        var code = 'break';
        if(ast.label) {
            code += ' ' + codeFromAST(ast.label);
        }
        return code + ';' + formatNewLine;
    }

    function codeFromContinueStatement(ast) {
        var code = 'continue';
        if(ast.label) {
            code += ' ' + codeFromAST(ast.label);
        }
        return code + ';' + formatNewLine;
    }

    function codeFromIfStatement(ast) {
        var code = 'if(' + codeFromAST(ast.test) + ')' + formatNewLine;
        var consequentCode = codeFromAST(ast.consequent);
        code += formatNewLine + consequentCode + formatNewLine;
        if(ast.alternate) {
            code += 'else' + formatNewLine;
            var alternateCode = codeFromAST(ast.alternate);
            if(ast.alternate.type != 'BlockStatement') {
                alternateCode = ' ' + alternateCode;
            }
            code += alternateCode;
        }
        return code + formatNewLine;
    }

    function codeFromSwitchStatement(ast) {
        var code = 'switch(' + codeFromAST(ast.discriminant) + '){' + formatNewLine;
        for(var i = 0, len = ast.cases.length; i < len; i++) {
            code += codeFromAST(ast.cases[i]);
        }
        return code + '}' + formatNewLine;
    }

    function codeFromSwitchCase(ast) {
        var code = '';
        if(ast.test){
            code += 'case ' + codeFromAST(ast.test) + ':' + formatNewLine;
        } else {
            code += 'default:' + formatNewLine;
        }
        for(var i = 0, len = ast.consequent.length; i < len; i++) {
            code += codeFromAST(ast.consequent[i]);
        }
        return code;
    }

    function codeFromThrowStatement(ast) {
        return 'throw ' + codeFromAST(ast.argument) + ';' + formatNewLine;
    }

    function codeFromTryStatement(ast) {
        var code = 'try' + codeFromAST(ast.block);
        if(ast.handler) {
            code += codeFromAST(ast.handler);
        }
        if(ast.finalizer) {
            code += 'finally' + codeFromAST(ast.finalizer);
        }
        return code;
    }

    function codeFromCatchClause(ast) {
        var code = 'catch(' + codeFromAST(ast.param) + ')';
        code += codeFromAST(ast.body);
        return code;
    }

    function codeFromWhileStatement(ast) {
        var code = 'while(' + codeFromAST(ast.test) + ')' + formatNewLine;
        var bodyCode = codeFromAST(ast.body);
        code += bodyCode;
        return code + formatNewLine;
    }

    function codeFromDoWhileStatement(ast) {
        var code = 'do';
        var bodyCode = codeFromAST(ast.body);
        if(ast.body.type != 'BlockStatement') {
            bodyCode = '{' + bodyCode + '}';
        }
        code += bodyCode;        
        code += 'while(';
        code += codeFromAST(ast.test);
        return code + ')' + formatNewLine;
    }

    function codeFromForStatement(ast) {
        var code = 'for(';
        if(ast.init) {
            code += codeFromAST(ast.init);
            if(code.charAt(code.length - 1) != ';') {
                code += ';';
            }
        } else {
            code += ';';
        }        
        if(ast.test) {
            code += codeFromAST(ast.test);
        }
        code += ';';
        if(ast.update) {
            code += codeFromAST(ast.update);
        }
        code += ')';
        var bodyCode = codeFromAST(ast.body);
        code += bodyCode;
        return code + formatNewLine;
    }

    function codeFromForInStatement(ast) {
        ast.left.noSemicolon = true;
        var code = 'for(' + codeFromAST(ast.left) + ' in ' + codeFromAST(ast.right) + ')';
        var bodyCode = codeFromAST(ast.body);
        code += bodyCode;
        return code + formatNewLine;
    }

    function codeFromFunctionDeclaration(ast) {
        return codeFromFunction(ast) + formatNewLine;
    }

    function codeFromVariableDeclaration(ast) {
        var code = ast.kind + ' ';
        for(var i = 0, len = ast.declarations.length; i < len; i++) {
            code += codeFromVariableDeclarator(ast.declarations[i]);
            if(len > 1 && i < len - 1) {
                code += ','
            }
        }
        if(!ast.noSemicolon) {
            code += ';';
        }
        return code;
    }

    function codeFromVariableDeclarator(ast) {
        var code = codeFromAST(ast.id);
        if(ast.init) {
            code += '=' + codeFromAST(ast.init);
        }
        return code;
    }

    function codeFromThisExpression(ast) {
        return 'this';
    }

    function codeFromArrayExpression(ast) {
        var code = '[';
        if(ast.elements) {
            for(var i = 0, len = ast.elements.length; i < len; i++) {
                if(i > 0) {
                    code += ', ';
                }
                var e = ast.elements[i];
                if(e) {
                    // 比如[1,,3]这种情况
                    code += codeFromAST(e);
                }                   
            }
        }
        return code + ']';
    }

    function codeFromObjectExpression(ast) {
        var code = '{';
        for(var i = 0, len = ast.properties.length; i < len; i++) {
            code += codeFromAST(ast.properties[i]);
            if(len > 1 && i < len - 1) {
                code += ',' + formatNewLine;
            }
        }
        return code + '}';
    }

    function codeFromProperty(ast) {
        return codeFromAST(ast.key) + ':' + codeFromAST(ast.value);
    }

    function codeFromFunctionExpression(ast) {
        var code = codeFromFunction(ast);
        if(ast.__fromCallExpression) {
            // 函数表达式
            code = '(' + code + ')';
        }
        return code;
    }

    function codeFromUnaryExpression(ast) {
        var code;
        var agm = codeFromAST(ast.argument);
        if(ast.argument.__calPriority >= ast.__calPriority) {
            agm = '(' + agm + ')';
        }
        if(ast.prefix) {
            code = codeFromUnaryOperator(ast.operator);
            if('typeof' == ast.operator || 'void' == ast.operator || 'delete' == ast.operator) {
                code += ' ';
            }
            code += agm;
        } else {
            code = agm + codeFromUnaryOperator(ast.operator);
        }
        return code;        
    }

    function codeFromUnaryOperator(ast) {
        return ast;
    }

    function codeFromUpdateExpression(ast) {
        var code = codeFromAST(ast.argument);
        if(ast.argument.__calPriority >= ast.__calPriority) {
            code = '(' + code+ ')';
        }
        if(ast.prefix) {
            code = codeFromUpdateOperator(ast.operator) + code;
        } else {
            code = code + codeFromUpdateOperator(ast.operator);
        }
        return code;
    }

    function codeFromUpdateOperator(ast) {
        return ast;
    }

    function codeFromBinaryExpression(ast) {
        var left = codeFromAST(ast.left);
        if(ast.left.__calPriority >= ast.__calPriority) {
            left = '(' + left + ')';
        } 
        var right = codeFromAST(ast.right);
        if(ast.right.__calPriority >= ast.__calPriority) {
            right = '(' + right + ')';
        }
        var code = left;
        if(left.charAt(left.length - 1) != ' ') {
            code += ' ';
        }
        code += codeFromBinaryOperator(ast.operator);
        if(right.charAt(0) != ' ') {
            code += ' ';
        }
        code += right;
        return code;
    }

    function codeFromBinaryOperator(ast) {
        return ast;   
    }

    function codeFromAssignmentExpression(ast) {
        var left = codeFromAST(ast.left);
        // 去掉所有Macros.xxx的定义
        if(!left) return '';
        return left + codeFromAssignmentOperator(ast.operator) + codeFromAST(ast.right);
    }

    function codeFromAssignmentOperator(ast) {
        return ast;
    }

    function codeFromLogicalExpression(ast) {
        var left = codeFromAST(ast.left);
        if(ast.left.__calPriority >= ast.__calPriority) {
            left = '(' + left + ')';
        } 
        var right = codeFromAST(ast.right);
        if(ast.right.__calPriority >= ast.__calPriority) {
            right = '(' + right + ')';
        } 
        var code = left + codeFromLogicalOperator(ast.operator) + right;
        return code;
    }

    function codeFromLogicalOperator(ast) {
        return ast;
    }

    function codeFromMemberExpression(ast) {
        var code = codeFromAST(ast.object);
        if(noBraceTypes.indexOf(ast.object.type) < 0) {
            code = '(' + code + ')';
        }
        if(ast.computed) {
            code += '[' + codeFromAST(ast.property) + ']';
        } else {
            code += '.' + codeFromAST(ast.property);
        }
        return code;
    }

    function codeFromConditionalExpression(ast) {
        return '(' +codeFromAST(ast.test) + ')?(' +codeFromAST(ast.consequent) + '):(' + codeFromAST(ast.alternate) + ')';
    }

    function codeFromCallExpression(ast) {
        ast.callee.__fromCallExpression = true;
        var code = codeFromAST(ast.callee);
        if(ast.callee.__calPriority > ast.__calPriority) {
            code = '(' + code + ')';
        }
        code += '(';
        for(var i = 0, len = ast.arguments.length; i < len; i++) {
            code += codeFromAST(ast.arguments[i]);
            if(len > 1 && i < len - 1) {
                code += ',';
            }
        }
        return code + ')';
    }

    function codeFromNewExpression(ast) {
        var calleeCode = codeFromAST(ast.callee);
        if(ast.callee.__calPriority > ast.__calPriority) {
            calleeCode = '(' + calleeCode + ')';
        }
        var code = 'new ' + calleeCode + '(';
        for(var i = 0, len = ast.arguments.length; i < len; i++) {
            code += codeFromAST(ast.arguments[i]);
            if(i < len - 1) {
                code += ',';
            }
        }
        return code + ')';
    }

    function codeFromSequenceExpression(ast) {
        var code = '(';
        for(var i = 0, len = ast.expressions.length; i < len; i++) {
            code += codeFromAST(ast.expressions[i]);
            if(i < len - 1) {
                code += ',';
            }
        }
        return code + ')';
    }

    function getCalPriority(raw) {
        var idx = operatorPriorityMap[raw];
        if(idx < 0) {
            idx = 999;
            console.error('no prioritys: ' + raw);
        }
        return idx;
    }

    // 对比语法树
    function compareAST(ast1, ast2) {
        var error;
        if((ast1 && !ast2) || (!ast1 && ast2)) {
            error = '[compareAST]ast not equal! ast1 = ' + JSON.stringify(ast1) + ', ast2 = ' + JSON.stringify(ast2);
        } else if(ast1) {
            if(ast1.type != ast2.type) {
                error = '[compareAST]ast type not equal!';
            } else {
                switch(ast1.type) {
                    case 'Node':
                        error = compareNode(ast1, ast2);
                        break;
                    case 'Identifier':
                        error = compareIdentifier(ast1, ast2);
                        break;
                    case 'Literal':
                        error = compareLiteral(ast1, ast2);
                        break;
                    case 'RegExpLiteral':
                        error = compareRegExpLiteral(ast1, ast2);
                        break;
                    case 'Program':
                        error = compareProgram(ast1, ast2);
                        break;
                    case 'Function':
                        error = compareFunction(ast1, ast2);
                        break;
                    case 'ExpressionStatement':
                        error = compareExpressionStatement(ast1, ast2);
                        break;
                    case 'Directive':
                        error = compareDirective(ast1, ast2);
                        break;
                    case 'BlockStatement':
                        error = compareBlockStatement(ast1, ast2);
                        break;
                    case 'FunctionBody':
                        error = compareFunctionBody(ast1, ast2);
                        break;
                    case 'EmptyStatement':
                        error = compareEmptyStatement(ast1, ast2);
                        break;
                    case 'DebuggerStatement':
                        error = compareDebuggerStatement(ast1, ast2);
                        break;
                    case 'WithStatement':
                        error = compareWithStatement(ast1, ast2);
                        break;
                    case 'ReturnStatement':
                        error = compareReturnStatement(ast1, ast2);
                        break;
                    case 'LabeledStatement':
                        error = compareLabeledStatement(ast1, ast2);
                        break;
                    case 'BreakStatement':
                        error = compareBreakStatement(ast1, ast2);
                        break;
                    case 'ContinueStatement':
                        error = compareContinueStatement(ast1, ast2);
                        break;
                    case 'IfStatement':
                        error = compareIfStatement(ast1, ast2);
                        break;
                    case 'SwitchStatement':
                        error = compareSwitchStatement(ast1, ast2);
                        break;
                    case 'SwitchCase':
                        error = compareSwitchCase(ast1, ast2);
                        break;
                    case 'ThrowStatement':
                        error = compareThrowStatement(ast1, ast2);
                        break;
                    case 'TryStatement':
                        error = compareTryStatement(ast1, ast2);
                        break;
                    case 'CatchClause':
                        error = compareCatchClause(ast1, ast2);
                        break;
                    case 'WhileStatement':
                        error = compareWhileStatement(ast1, ast2);
                        break;
                    case 'DoWhileStatement':
                        error = compareDoWhileStatement(ast1, ast2);
                        break;
                    case 'ForStatement':
                        error = compareForStatement(ast1, ast2);
                        break;
                    case 'ForInStatement':
                        error = compareForInStatement(ast1, ast2);
                        break;
                    case 'FunctionDeclaration':
                        error = compareFunctionDeclaration(ast1, ast2);
                        break;
                    case 'VariableDeclaration':
                        error = compareVariableDeclaration(ast1, ast2);
                        break;
                    case 'VariableDeclarator':
                        error = compareVariableDeclarator(ast1, ast2);
                        break;
                    case 'ThisExpression':
                        error = compareThisExpression(ast1, ast2);
                        break;
                    case 'ArrayExpression':
                        error = compareArrayExpression(ast1, ast2);
                        break;
                    case 'ObjectExpression':
                        error = compareObjectExpression(ast1, ast2);
                        break;
                    case 'Property':
                        error = compareProperty(ast1, ast2);
                        break;
                    case 'FunctionExpression':
                        error = compareFunctionExpression(ast1, ast2);
                        break;
                    case 'UnaryExpression':
                        error = compareUnaryExpression(ast1, ast2);
                        break;
                    case 'UnaryOperator':
                        error = compareUnaryOperator(ast1, ast2);
                        break;
                    case 'UpdateExpression':
                        error = compareUpdateExpression(ast1, ast2);
                        break;
                    case 'UpdateOperator':
                        error = compareUpdateOperator(ast1, ast2);
                        break;
                    case 'BinaryExpression':
                        error = compareBinaryExpression(ast1, ast2);
                        break;
                    case 'BinaryOperator':
                        error = compareBinaryOperator(ast1, ast2);
                        break;
                    case 'AssignmentExpression':
                        error = compareAssignmentExpression(ast1, ast2);
                        break;
                    case 'AssignmentOperator':
                        error = compareAssignmentOperator(ast1, ast2);
                        break;
                    case 'LogicalExpression':
                        error = compareLogicalExpression(ast1, ast2);
                        break;
                    case 'LogicalOperator':
                        error = compareLogicalOperator(ast1, ast2);
                        break;
                    case 'MemberExpression':
                        error = compareMemberExpression(ast1, ast2);
                        break;
                    case 'ConditionalExpression':
                        error = compareConditionalExpression(ast1, ast2);
                        break;
                    case 'CallExpression':
                        error = compareCallExpression(ast1, ast2);
                        break;
                    case 'NewExpression':
                        error = compareNewExpression(ast1, ast2);
                        break;
                    case 'SequenceExpression':
                        error = compareSequenceExpression(ast1, ast2);
                        break;
                    default:
                        if(ast1 != ast2) {
                            error = '[error = compareAST]ast value not equal!';
                        }
                        break;
                }
            }
        }            
        
        if(error && !errorMsg) {
            log('diffs from two ast!');
            var astSimp1 = astToSimpleString(ast1) ;
            var astSimp2 = astToSimpleString(ast2) ;
            errorMsg = error + '\nast1=' + astSimp1 + '\nast2=' + astSimp2;
            astSaved1 = 'code>>\n' + codeFromAST(ast1) + '\n\nast>>\n' + astSimp1;
            astSaved2 = 'code>>\n' + codeFromAST(ast2) + '\n\nast>>\n' + astSimp2;
        }
        
        return error;
    }

    function checkDisplayError() {
        if(errorMsg) {
            //console.error(errorMsg);
            fs.writeFile('ast1.json', astSaved1, function(err) {
                if (err) {
                    throw err;
                }
                log('ast1.json saved.');
            });
            fs.writeFile('ast2.json', astSaved2, function(err) {
                if (err) {
                    throw err;
                }
                log('ast2.json saved.');
            });
        }
    }

    function compareNode(ast1, ast2) {
        return null;
    }

    function compareIdentifier(ast1, ast2) {
        if(ast1.name != ast2.name) {
            return '[Identifier]name not equal.';
        }
        return null;
    }

    function compareLiteral(ast1, ast2) {
        var isRe1 = ast1.value instanceof RegExp;
        var isRe2 = ast2.value instanceof RegExp;
        if(isRe1 != isRe2) {
            return '[Literal]value type not equal.';
        }
        if(isRe1) {
            if(ast1.value.source != ast2.value.source) {
                return '[Literal]regexp not equal.';
            }
        } else if(ast1.value != ast2.value) {
            return '[Literal]value not equal.';
        }
        return null;
    }

    function compareRegExpLiteral(ast1, ast2) {
        if(ast1.regex.pattern != ast2.regex.pattern) {
            return '[RegExpLiteral]regex pattern not equal.';
        }
        if(ast1.regex.flags != ast2.regex.flags) {
            return '[RegExpLiteral]regex flags not equal.';
        }
        return compareLiteral(ast1, ast2);
    }

    function compareProgram(pgm1, pgm2) {
        var len1 = pgm1.body.length;
        var len2 = pgm2.body.length;
        if(len1 != len2)  {
            return '[Program]body length not equal.';
        }
        for(var i = 0; i < len1; i++) {
            var rst = compareAST(pgm1.body[i], pgm2.body[i]);
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareFunction(ast1, ast2) {
        if((ast1.id && !ast2.id) || (!ast1.id && ast2.id)) {
            return '[Function]function id not equal.';
        }
        if(ast1.id) {
            var rst = compareAST(ast1.id, ast2.id);
            if(rst) {
                return rst;
            }
        }
        var len1 = ast1.params.length;
        var len2 = ast2.params.length;
        if(len1 != len2)  {
            return '[Function]params length not equal.';
        }
        for(var i = 0; i < len1; i ++) {
            var rst = compareAST(ast1.params[i], ast2.params[i]);
            if(rst) {
                return rst;
            }
        }
        return compareAST(ast1.body, ast2.body);
    }

    function compareExpressionStatement(ast1, ast2) {
        return compareAST(ast1.expression, ast2.expression);
    }

    function compareDirective(ast1, ast2) {
        console.error('ERROR: compareDirective');
        return compareLiteral(ast1.expression, ast2.expression);
    }

    function compareBlockStatement(ast1, ast2) {
        var len1 = ast1.body.length;
        var len2 = ast2.body.length;
        if(len1 != len2)  {
            return '[BlockStatement]body length not equal.';
        }
        for(var i = 0; i < len1; i++) {
            var rst = compareAST(ast1.body[i], ast2.body[i]);
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareFunctionBody(ast1, ast2) {
        return compareAST(ast1, ast2);
    }

    function compareEmptyStatement(ast1, ast2) {
        return null;
    }

    function compareDebuggerStatement(ast1, ast2) {
        return null;
    }

    function compareWithStatement(ast1, ast2) {
        return compareAST(ast1.object, ast2.object) || compareAST(ast1.body, ast2.body);
    }

    function compareReturnStatement(ast1, ast2) {
        if((ast1.argument && !ast2.argument) || (!ast1.argument && ast2.argument)) {
            return '[ReturnStatement]argument not equal.';
        }
        if(ast1.argument) {
            var rst = compareAST(ast1.argument, ast2.argument); 
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareLabeledStatement(ast1, ast2) {
        return compareAST(ast1.label, ast2.label) || compareAST(ast1.body, ast2.body);
    }

    function compareBreakStatement(ast1, ast2) {
        if((ast1.label && !ast2.label) || (!ast1.label && ast2.label)) {
            return '[BreakStatement]label not equal.';
        }
        if(ast1.label) {
            var rst = compareAST(ast1.label, ast2.label); 
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareContinueStatement(ast1, ast2) {
        if((ast1.label && !ast2.label) || (!ast1.label && ast2.label)) {
            return '[BreakStatement]label not equal.';
        }
        if(ast1.label) {
            var rst = compareAST(ast1.label, ast2.label); 
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareIfStatement(ast1, ast2) {
        var rst = compareAST(ast1.test, ast2.test) || compareAST(ast1.consequent, ast2.consequent);
        if(rst) {
            return rst;
        }
        if((ast1.alternate && !ast2.alternate) || (!ast1.alternate && ast2.alternate)) {
            return '[IfStatement]alternate not equal.';
        }
        if(ast1.alternate) {
            var rst = compareAST(ast1.alternate, ast2.alternate); 
            if(rst) {
                return rst;
            }
        }
    }

    function compareSwitchStatement(ast1, ast2) {
        var rst = compareAST(ast1.discriminant, ast2.discriminant);
        if(rst) {
            return rst;
        }
        var len1 = ast1.cases.length;
        var len2 = ast2.cases.length;
        if(len1 != len2)  {
            return '[SwitchStatement]cases length not equal.';
        }
        for(var i = 0; i < len1; i++) {
            var rst = compareSwitchCase(ast1.cases[i], ast2.cases[i]);
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareSwitchCase(ast1, ast2) {
        if((ast1.test && !ast2.test) || (!ast1.test && ast2.test)) {
            return '[SwitchCase]test not equal.';
        }
        if(ast1.test) {
            var rst = compareAST(ast1.test, ast2.test); 
            if(rst) {
                return rst;
            }
        }
        var len1 = ast1.consequent.length;
        var len2 = ast2.consequent.length;
        if(len1 != len2)  {
            return '[SwitchCase]consequent length not equal.';
        }
        for(var i = 0; i < len1; i++) {
            var rst = compareAST(ast1.consequent[i], ast2.consequent[i]);
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareThrowStatement(ast1, ast2) {
        return compareAST(ast1.argument, ast2.argument);
    }

    function compareTryStatement(ast1, ast2) {
        var rst = compareBlockStatement(ast1.block, ast2.block);
        if(rst) {
            return rst;
        }
        if((ast1.handler && !ast2.handler) || (!ast1.handler && ast2.handler)) {
            return '[TryStatement]handler not equal.';
        }
        if(ast1.handler) {
            var rst = compareAST(ast1.handler, ast2.handler); 
            if(rst) {
                return rst;
            }
        }
        if((ast1.finalizer && !ast2.finalizer) || (!ast1.finalizer && ast2.finalizer)) {
            return '[TryStatement]finalizer not equal.';
        }
        if(ast1.finalizer) {
            var rst = compareAST(ast1.finalizer, ast2.finalizer); 
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareCatchClause(ast1, ast2) {
        return compareAST(ast1.param, ast2.param) || compareBlockStatement(ast1.body, ast2.body);
    }

    function compareWhileStatement(ast1, ast2) {
        return compareAST(ast1.test, ast2.test) || compareAST(ast1.body, ast2.body);
    }

    function compareDoWhileStatement(ast1, ast2) {
        return compareAST(ast1.body, ast2.body) || compareAST(ast1.test, ast2.test);
    }

    function compareForStatement(ast1, ast2) {
        if((ast1.init && !ast2.init) || (!ast1.init && ast2.init)) {
            return '[ForStatement]init not equal.';
        }
        if(ast1.init) {
            var rst = compareAST(ast1.init, ast2.init); 
            if(rst) {
                return rst;
            }
        }
        if((ast1.test && !ast2.test) || (!ast1.test && ast2.test)) {
            return '[ForStatement]test not equal.';
        }
        if(ast1.test) {
            var rst = compareAST(ast1.test, ast2.test); 
            if(rst) {
                return rst;
            }
        }
        if((ast1.update && !ast2.update) || (!ast1.update && ast2.update)) {
            return '[ForStatement]update not equal.';
        }
        if(ast1.update) {
            var rst = compareAST(ast1.update, ast2.update); 
            if(rst) {
                return rst;
            }
        }
        return compareAST(ast1.body, ast2.body);
    }

    function compareForInStatement(ast1, ast2) {
        return compareAST(ast1.left, ast2.left) || compareAST(ast1.right, ast2.right) || compareAST(ast1.body, ast2.body);
    }

    function compareFunctionDeclaration(ast1, ast2) {
        return compareFunction(ast1, ast2);
    }

    function compareVariableDeclaration(ast1, ast2) {
        var len1 = ast1.declarations.length;
        var len2 = ast2.declarations.length;
        if(len1 != len2)  {
            return '[VariableDeclaration]declarations length not equal.';
        }
        for(var i = 0; i < len1; i++) {
            var rst = compareAST(ast1.declarations[i], ast2.declarations[i]);
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareVariableDeclarator(ast1, ast2) {
        var rst = compareAST(ast1.id, ast2.id);
        if(rst) {
            return rst;
        }
        if((ast1.init && !ast2.init) || (!ast1.init && ast2.init)) {
            return '[VariableDeclarator]init not equal.';
        }
        if(ast1.init) {
            var rst = compareAST(ast1.init, ast2.init); 
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareThisExpression(ast1, ast2) {
        return null;
    }

    function compareArrayExpression(ast1, ast2) {
        var len1 = ast1.elements.length;
        var len2 = ast2.elements.length;
        if(len1 != len2)  {
            return '[ArrayExpression]elements length not equal.';
        }
        for(var i = 0; i < len1; i++) {
            var rst = compareAST(ast1.elements[i], ast2.elements[i]);
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareObjectExpression(ast1, ast2) {
        var len1 = ast1.properties.length;
        var len2 = ast2.properties.length;
        if(len1 != len2)  {
            return '[ObjectExpression]properties length not equal.';
        }
        for(var i = 0; i < len1; i++) {
            var rst = compareAST(ast1.properties[i], ast2.properties[i]);
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareProperty(ast1, ast2) {
        return compareAST(ast1.key, ast2.key) || compareAST(ast1.value, ast2.value);
    }

    function compareFunctionExpression(ast1, ast2) {
        return compareFunction(ast1, ast2);       
    }

    function compareUnaryExpression(ast1, ast2) {
        return compareUnaryOperator(ast1.operator, ast2.operator) || compareAST(ast1.prefix, ast2.prefix) || compareAST(ast1.argument, ast2.argument);
    }

    function compareUnaryOperator(ast1, ast2) {
        if(ast1 != ast2) {
            return '[UnaryOperator]UnaryOperator not equal.';
        }
        return null;
    }

    function compareUpdateExpression(ast1, ast2) {
        return compareUpdateOperator(ast1.operator, ast2.operator) || compareAST(ast1.argument, ast2.argument) || compareAST(ast1.prefix, ast2.prefix);
    }

    function compareUpdateOperator(ast1, ast2) {
        if(ast1 != ast2) {
            return '[UpdateOperator]UpdateOperator not equal.';
        }
        return null;
    }

    function compareBinaryExpression(ast1, ast2) {
        return compareBinaryOperator(ast1.operator, ast2.operator) || compareAST(ast1.left, ast2.left) || compareAST(ast1.right, ast2.right);
    }

    function compareBinaryOperator(ast1, ast2) {
        if(ast1 != ast2) {
            return '[BinaryOperator]BinaryOperator not equal.';
        }
        return null;
    }

    function compareAssignmentExpression(ast1, ast2) {
        return compareAssignmentOperator(ast1.operator, ast2.operator) || compareAST(ast1.left, ast2.left) || compareAST(ast1.right, ast2.right);
    }

    function compareAssignmentOperator(ast1, ast2) {
        if(ast1 != ast2) {
            return '[AssignmentOperator]AssignmentOperator not equal.';
        }
        return null;
    }

    function compareLogicalExpression(ast1, ast2) {
        return compareLogicalOperator(ast1.operator, ast2.operator) || compareAST(ast1.left, ast2.left) || compareAST(ast1.right, ast2.right);
    }

    function compareLogicalOperator(ast1, ast2) {
        if(ast1 != ast2) {
            return '[LogicalOperator]LogicalOperator not equal.';
        }
        return null;
    }

    function compareMemberExpression(ast1, ast2) {
        return compareAST(ast1.object, ast2.object) || compareAST(ast1.property, ast2.property) || compareAST(ast1.computed, ast2.computed);
    }

    function compareConditionalExpression(ast1, ast2) {
        return compareAST(ast1.test, ast2.test) || compareAST(ast1.alternate, ast2.alternate) || compareAST(ast1.consequent, ast2.consequent);
    }

    function compareCallExpression(ast1, ast2) {
        var rst = compareAST(ast1.callee, ast2.callee);
        if(rst) {
            return rst;
        }
        var len1 = ast1.arguments.length;
        var len2 = ast2.arguments.length;
        if(len1 != len2)  {
            return '[CallExpression]arguments length not equal.';
        }
        for(var i = 0; i < len1; i++) {
            var rst = compareAST(ast1.arguments[i], ast2.arguments[i]);
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareNewExpression(ast1, ast2) {
        var rst = compareAST(ast1.callee, ast2.callee);
        if(rst) {
            return rst;
        }
        var len1 = ast1.arguments.length;
        var len2 = ast2.arguments.length;
        if(len1 != len2)  {
            return '[NewExpression]arguments length not equal.';
        }
        for(var i = 0; i < len1; i++) {
            var rst = compareAST(ast1.arguments[i], ast2.arguments[i]);
            if(rst) {
                return rst;
            }
        }
        return null;
    }

    function compareSequenceExpression(ast1, ast2) {
        var len1 = ast1.expressions.length;
        var len2 = ast2.expressions.length;
        if(len1 != len2)  {
            return '[SequenceExpression]expressions length not equal.';
        }
        for(var i = 0; i < len1; i++) {
            var rst = compareAST(ast1.expressions[i], ast2.expressions[i]);
            if(rst) {
                return rst;
            }
        }
        return null;
    }
    
    /////////////////////////////////////////// 废代码 ///////////////////////////////////////////
    
    function genSimpleVar(rename) {
        var declarations = [];
        var dcnt = Math.ceil(Math.random() * 5);
        for(var i = 0; i < dcnt; i++) {
            var declarator = genSimpleVarDct(rename ? ('__rubbish' + i) : null);
            declarations.push(declarator);
        }
        var rubbish = genVariableDeclaration(0, null, null, declarations);
        rubbish.__isRubbish = true;
        return rubbish;
    }
    
    function genSimpleVarDct(name) {
        var did = genIdentifier(0, null, null, name);
        var dinit = null;
        var rdn = Math.random();
        if(rdn > 0.75) {
            dinit = genLiteral(0, null, null, Math.random());
        } else if(rdn > 0.5) {
            dinit = genArrayExpression(0, ['Literal'], null);
        } else if(rdn > 0.25) {
            dinit = genObjectExpression(0, ['Literal'], null);
        }
        return genVariableDeclarator(0, null, null, did, dinit);
    }
    
    function genSimpleClass() {
        var did = genIdentifier(0, null, null, null, '__rubbishClass');
        var savedVarCnt = rubbishVarCnt;
        rubbishVarCnt = 0;
        var fbExpressions = [];
        var ecnt = Math.ceil(Math.random() * 5);
        for(var i = 0; i < ecnt; i++) {
            var dinit;
            if(Math.random() > 0.5) {
                dinit = genExpression(0);
            }
            var ae = genAssignmentExpression(0, null, null, '=', genMemberExpression(0, null, null, genThisExpression(0, null, null), genIdentifier(0), false), genLiteral(0));
            fbExpressions.push(genExpressionStatement(0, null, null, ae));
        }
        var fdBody = genBlockStatement(0, null, null, fbExpressions);
        var fd = genFunctionDeclaration(0, null, null, did, [], fdBody);
        var returnStm = genReturnStatement(0, null, null, did);
        var body = genBlockStatement(0, null, null, [fd, returnStm]);
        var callee = genFunctionExpression(0, null, null, null, [], body);
        var dinit = genCallExpression(0, null, null, callee, arguments);
        var declarator = genVariableDeclarator(0, null, null, did, dinit);
        // var declarations = [declarator];
        // var rubbish = genVariableDeclaration(0, null, null, declarations);
        // return rubbish;
        rubbishVarCnt = savedVarCnt;
        declarator.__isRubbish = true;
        return declarator;
    }
    
    function genExpression(deep, choices, excludes) {
        if(!choices) {
            choices = ['Literal', 'Identifier', 'ArrayExpression', 'ObjectExpression', 'FunctionExpression', 'UnaryExpression', 'UpdateExpression', 'BinaryExpression', 'AssignmentExpression', 'LogicalExpression', 'MemberExpression', 'ConditionalExpression'];
        }
        var ccc = [];
        for(var i = 0, len = choices.length; i < len; i++) {
            if((!excludes || excludes.indexOf(choices[i]) < 0) && (deep < ComplexDeep || SimplestTypes.indexOf(choices[i]) >= 0)) {
                ccc.push(choices[i]);
            }
        }
        type = ccc[Math.floor(Math.random() * ccc.length)];
        
        var e;
        switch(type) {
            case 'ArrayExpression':
                e = genArrayExpression(deep, choices, excludes);
                break;
            case 'ObjectExpression':
                e = genObjectExpression(deep, choices, excludes);
                break;
            case 'FunctionExpression':
                e = genFunctionExpression(deep, choices, excludes);
                break;
            case 'UnaryExpression':
                e = genUnaryExpression(deep, choices, excludes);
                break;
            case 'UpdateExpression':
                e = genUpdateExpression(deep, choices, excludes);
                break;
            case 'BinaryExpression':
                e = genBinaryExpression(deep, choices, excludes);
                break;
            case 'AssignmentExpression':
                e = genAssignmentExpression(deep, choices, excludes);
                break;
            case 'LogicalExpression':
                e = genLogicalExpression(deep, choices, excludes);
                break;
            case 'MemberExpression':
                e = genMemberExpression(deep, choices, excludes);
                break;
            case 'ConditionalExpression':
                e = genConditionalExpression(deep, choices, excludes);
                break;
            case 'Identifier':
                e = genIdentifier(deep, choices, excludes);
            case 'Literal':
            default:
                e = genLiteral(deep, choices, excludes);
                break;
        }
        return e;
    }
    
    function genExpressions(deep, choices, excludes) {
        list = [];
        var ecnt = Math.ceil(Math.random() * 5);
        for(var i = 0; i < ecnt; i++) {
            var exp = genExpression(deep, choices, excludes);
            list.push(exp);
        }
        return list;
    }
    
    function genStatement(deep, choices, excludes) {
        var type = 'ExpressionStatement';
        if(deep < 3) {
            if(!choices) {
                choices = ['ExpressionStatement', 'BlockStatement', 'IfStatement', 'SwitchStatement', 'WhileStatement', 'ForStatement', 'ForInStatement'];
            }
            var ccc = [];
            for(var i = 0, len = choices.length; i < len; i++) {
                if(!excludes || excludes.indexOf(choices[i]) < 0) {
                    ccc.push(choices[i]);
                }
            }
            var type = ccc[Math.floor(Math.random() * ccc.length)];
        }
        var e;
        switch(type) {
            case 'BlockStatement':
                e = genBlockStatement(deep, choices, excludes);
                break;
            case 'IfStatement':
                e = genIfStatement(deep, choices, excludes);
                break;
            case 'SwitchStatement':
                e = genSwitchStatement(deep, choices, excludes);
                break;
            case 'WhileStatement':
                e = genWhileStatement(deep, choices, excludes);
                break;
            case 'ForStatement':
                e = genForStatement(deep, choices, excludes);
                break;
            case 'ForInStatement':
                e = genForInStatement(deep, choices, excludes);
            case 'ExpressionStatement':
            default:
                e = genExpressionStatement(deep, choices, excludes);
                break;
        }
        return e;
    }
    
    function genStatements(deep, choices, excludes) {
        list = [];
        var scnt = Math.ceil(Math.random() * 5);
        for(var i = 0; i < scnt; i++) {
            var stm = genStatement(deep, choices, excludes);
            list.push(stm);
        }
        return list;
    }
    
    function genPatterns(deep, choices, excludes) {
        var patterns = [];
        var pcnt = Math.ceil(Math.random() * 5);
        for(var i = 0; i < pcnt; i++) {
            var pid = genIdentifier(deep, choices, excludes);
            patterns.push(pid);
        }
        return patterns;
    }
    
    function genNode(deep, choices, excludes) {
        return {};
    }

    function genIdentifier(deep, choices, excludes, name, nameClass) {
        if(!name) {
            name = (nameClass ? nameClass : '__rubbish') + (rubbishVarCnt++);
        }
        return {"type": "Identifier", "name": toUgly(name, true)};
    }

    function genLiteral(deep, choices, excludes, value) {
        var raw;
        if(!value) {
            var rdn = Math.random();
            if(rdn > 0.8) {
                value = resFileNames[Math.floor(Math.random() * resFileNames.length)];
            } else if(rdn > 0.6) {
                value = true;
            } else if(rdn > 0.5) {
                value = true;
            } else if(rdn > 0.4) {
                value = false;
            } else if(rdn > 0.2) {
                value = Math.floor(rdn * 1000);
            } else {
                value = null;
            }
        }
        if(value) {
            if(typeof value === 'string') {
                raw = '\'' + value + '\'';
            } else if(typeof value === 'boolean') {
                raw = value ? 'true' : 'false';
            } else {
                raw = value.toString();
            }
        } else {
            raw = 'null';
        }
        return {"type": "Literal", "value": value, "raw": raw};
    }

    function genRegExpLiteral(deep, choices, excludes, pattern, flags) {
        var ast = genLiteral(deep + 1, choices, excludes);
        ast.regex = {"pattern": pattern, "flags": flags}
        return ast;
    }

    function genProgram(deep, choices, excludes, body) {
        return {"type": "Program", "body": body};
    }

    function genFunction(deep, choices, excludes, id, params, body) {
        if(!id && Math.random() > 0.5){
            id = genIdentifier(deep + 1, choices, excludes);
        }
        var savedVarCnt = rubbishVarCnt;
        rubbishVarCnt = 0;
        if(!params && Math.random() > 0.5) {
            params = genPatterns(deep + 1, choices, excludes);
        }
        if(!body) {
            body = genBlockStatement(deep + 1, choices, mergeArray(excludes, ["FunctionExpression"]));
        }
        rubbishVarCnt = savedVarCnt;
        return {"id": id, "params": params, "body": body};
    }

    function genExpressionStatement(deep, choices, excludes, expression) {
        if(!expression) {
            expression = genExpression(deep + 1, choices, excludes);
        }
        return {"type": "ExpressionStatement", "expression": expression};
    }

    function genDirective(deep, choices, excludes, expression, directive) {
        return {"type": "ExpressionStatement", "expression": expression, "directive": directive};
    }

    function genBlockStatement(deep, choices, excludes, body) {
        if(!body) {
            body = genStatements(deep, choices, mergeArray(excludes, ["BlockStatement"]));
        }
        return {"type": "BlockStatement", "body": body};
    }

    function genFunctionBody(deep, choices, excludes) {
        return genBlockStatement(deep, choices, excludes);
    }

    function genEmptyStatement(deep, choices, excludes) {
        return {"type": "EmptyStatement"};
    }

    function genDebuggerStatement(deep, choices, excludes) {
        return {"type": "DebuggerStatement"};
    }

    function genWithStatement(deep, choices, excludes, object, body) {
        return {"type": "WithStatement", "object": object, "body": body};
    }

    function genReturnStatement(deep, choices, excludes, argument) {
        if(!argument) {
            argument = genExpression(deep + 1, ["Identifier", "MemberExpression"], excludes);
        }
        return {"type": "ReturnStatement", "argument": argument};
    }

    function genLabeledStatement(deep, choices, excludes, label, body) {
        return {"type": "LabeledStatement", "label": label, "body": body};
    }

    function genBreakStatement(deep, choices, excludes, label) {
        return {"type": "BreakStatement", "label": label};
    }

    function genContinueStatement(deep, choices, excludes) {
        return {"type": "ContinueStatement", "label": label};
    }

    function genIfStatement(deep, choices, excludes, test, consequent, alternate) {
        if(!test) {
            test = genExpression(deep + 1, ["Identifier", "MemberExpression"], excludes);
        }
        if(!consequent) {
            consequent = genStatement(deep + 1, ["ExpressionStatement", "BlockStatement"], excludes);
        }
        if(!alternate && Math.random() > 0.5) {
            alternate = genStatement(deep + 1, ["ExpressionStatement", "BlockStatement"], excludes);
        }
        return {"type": "IfStatement", "test": test, "consequent": consequent, "alternate": alternate};
    }

    function genSwitchStatement(deep, choices, excludes, discriminant, cases) {
        if(!discriminant) {
            discriminant = genExpression(deep + 1, ["Identifier", "MemberExpression"], excludes);
        }
        if(!cases) {
            cases = [];
            var scCnt = Math.ceil(Math.random() * 5);
            for(var i = 0; i < scCnt; i++) {
                var sc = genSwitchCase(deep + 1, choices, excludes);
                cases.push(sc);
            }
        }
        return {"type": "SwitchStatement", "discriminant": discriminant, "cases": cases};
    }

    function genSwitchCase(deep, choices, excludes, test, consequent) {
        if(!test && Math.random() > 0.5) {
            test = genExpression(deep, ["Identifier"], excludes);
        }
        if(!consequent) {
            consequent = genStatements(deep, choices, mergeArray(excludes, ["SwitchStatement"]));
        }
        return {"type": "SwitchCase", "test": test, "consequent": consequent};
    }

    function genThrowStatement(deep, choices, excludes, argument) {
        return {"type": "ThrowStatement", "argument": argument};
    }

    function genTryStatement(deep, choices, excludes, block, handler, finalizer) {
        return {"type": "TryStatement", "block": block, "handler": handler, "finalizer": finalizer};
    }

    function genCatchClause(deep, choices, excludes, param, body) {
        return {"type": "CatchClause", "param": param, "body": body};
    }

    function genWhileStatement(deep, choices, excludes, test, body) {
        if(!test) {
            test = genExpression(deep + 1, ['Identifier', 'MemberExpression', 'UnaryExpression', 'BinaryExpression'], excludes);
        }
        if(!body) {
            body = genStatement(deep + 1, ["ExpressionStatement", "BlockStatement"], excludes);
        }
        return {"type": "WhileStatement", "test": test, "body": body};
    }

    function genDoWhileStatement(deep, choices, excludes) {
        if(!body) {
            body = genStatement(deep + 1, ["ExpressionStatement", "BlockStatement"], excludes);
        }
        if(!test) {
            test = genExpression(deep + 1, ['Identifier', 'MemberExpression', 'UnaryExpression', 'BinaryExpression'], excludes);
        }
        return {"type": "DoWhileStatement", "body": body, "test": test};
    }

    function genForStatement(deep, choices, excludes, init, test, update, body) {
        if(!init && Math.random() > 0.5) {
            init = genVariableDeclaration(deep + 1, choices, excludes);
        }
        if(!test && Math.random() > 0.5) {
            test = genExpression(deep + 1, ["LogicalExpression"], excludes);
        }
        if(!update && Math.random() > 0.5) {
            update = genExpression(deep + 1, ["UpdateExpression"], excludes);
        }
        if(!body) {
            body = genStatement(deep + 1, ["ExpressionStatement", "BlockStatement"], excludes);
        }
        return {"type": "ForStatement", "init": init, "test": test, "update": update, "body": body};
    }

    function genForInStatement(deep, choices, excludes, left, right, body) {
        if(!left) {
            init = genVariableDeclaration(deep + 1, choices, excludes);
        }
        if(!right){
            right = genExpression(deep + 1, ['Identifier', 'MemberExpression'], excludes);
        }
        if(!body) {
            body = genStatement(deep + 1, ["ExpressionStatement", "BlockStatement"], excludes);
        }
        return {"type": "ForInStatement", "left": left, "right": right, "body": body};
    }

    function genFunctionDeclaration(deep, choices, excludes, id, params, body) {
        var ast = genFunction(deep + 1, choices, excludes, id, params, body);
        ast.type = "FunctionDeclaration";
        return ast;
    }

    function genVariableDeclaration(deep, choices, excludes, declarations) {
        if(!declarations) {
            declarations = [];
            var dcnt = Math.ceil(Math.random() * 5);
            for(var i = 0; i < dcnt; i++) {
                var d = genVariableDeclarator(deep, choices, excludes);
                declarations.push(d);
            }
        }
        return {"type": "VariableDeclaration", "declarations": declarations, "kind": "var"};
    }

    function genVariableDeclarator(deep, choices, excludes, id, init) {
        if(!id) {
            id = genIdentifier(deep + 1, choices, excludes);
        }
        if(undefined === init && Math.random() > 0.5) {
            init = genExpression(deep + 1, choices, mergeArray(excludes, ['SequenceExpression']));
        }
        return {"type": "VariableDeclarator", "id": id, "init": init ? init : null};
    }

    function genThisExpression(deep, choices, excludes) {
        return {"type": "ThisExpression"};
    }

    function genArrayExpression(deep, choices, excludes, elements) {
        if(!elements && Math.random() > 0.5) {
            elements = genSequenceExpression(deep + 1, choices, mergeArray(excludes, ['AssignmentExpression']));
        }
        return {"type": "ArrayExpression", "elements": elements};
    }

    function genObjectExpression(deep, choices, excludes, properties) {
        if(!properties) {
            properties = [];
            var pcnt = Math.ceil(Math.random() * 5);
            // 为了节省变量名，key不要随机
            var keybase = Math.floor(Math.random() * 10);
            for(var i = 0; i < pcnt; i++) {
                var ppt = genProperty(deep + 1, choices, excludes, 'k' + (keybase + i));
                properties.push(ppt);
            }
        }
        return {"type": "ObjectExpression", "properties": properties};
    }

    function genProperty(deep, choices, excludes, keyname, value, kind) {
        var key = genIdentifier(deep + 1, choices, excludes, keyname);
        if(!value) {
            value = genExpression(deep + 1, choices ? choices : ['Identifier', 'Literal', 'MemberExpression', 'AssignmentExpression'], excludes);
        }
        if(!kind) {
            kind = 'init';
        }
        return {"type": "Property", "key": key, "value": value, "kind": kind};
    }

    function genFunctionExpression(deep, choices, excludes, id, params, body) {
        var ast = genFunction(deep, choices, excludes, id, params, body);       
        ast.type = "FunctionExpression";
        return ast;
    }

    function genUnaryExpression(deep, choices, excludes, operator, prefix, argument) {
        if(!operator) {
            operator = genUnaryOperator(deep + 1, choices, excludes);
        }
        if(!argument) {
            argument = genExpression(deep + 1, choices, mergeArray(excludes, ['UnaryExpression', 'AssignmentExpression', 'SequenceExpression']));
        }
        return {"type": "UnaryExpression", "operator": operator, "prefix": true, "argument": argument};
    }

    function genUnaryOperator(deep, choices, excludes) {
        var list = ["-", "+", "!"];  //, "~", "typeof", "void", "delete"
        return list[Math.floor(Math.random() * list.length)];
    }

    function genUpdateExpression(deep, choices, excludes, operator, argument, prefix) {
        if(!operator) {
            operator = genUpdateOperator(deep + 1, choices, excludes);
        }
        if(!argument) {
            argument = genExpression(deep + 1, null, mergeArray(excludes, ['UpdateExpression', 'AssignmentExpression', 'SequenceExpression']));
        }
        if(undefined === prefix) {
            prefix = Math.random() > 0.5;
        }
        return {"type": "UpdateExpression", "operator": operator, "argument": argument, "prefix": prefix};
    }

    function genUpdateOperator(deep, choices, excludes) {
        var list = ["++", "--"];
        return list[Math.floor(Math.random() * list.length)];
    }

    function genBinaryExpression(deep, choices, excludes, operator, left, right) {
        if(!operator) {
            operator = genBinaryOperator(deep + 1, choices, excludes);
        }
        if(!left){
            left = genExpression(deep + 1, null, mergeArray(excludes, ['BinaryExpression', 'AssignmentExpression', 'SequenceExpression']));
        }
        if(!right) {
            right = genExpression(deep + 1, null, mergeArray(excludes, ['BinaryExpression', 'AssignmentExpression', 'SequenceExpression']));
        }
        return {"type": "BinaryExpression", "operator": operator, "left": left, "right": right};
    }

    function genBinaryOperator(deep, choices, excludes) {
        var list = ["==", "!=", "===", "!==", "<", "<=", ">", ">=", "<<", ">>", ">>>", "+", "-", "*", "/", "%", "|", "&"];  //, "^", "in", "instanceof"
        return list[Math.floor(Math.random() * list.length)];
    }

    function genAssignmentExpression(deep, choices, excludes, operator, left, right) {
        if(!operator){
            operator = genAssignmentOperator(deep + 1, choices, excludes);
        }
        if(!left) {
            left = genExpression(deep + 1, ['Identifier', 'MemberExpression'], excludes);
        }
        if(!right) {
            right = genExpression(deep + 1, null, mergeArray(excludes, ['SequenceExpression']));
        }
        return {"type": "AssignmentExpression", "operator": operator, "left": left, "right": right};
    }

    function genAssignmentOperator(deep, choices, excludes) {
        var list = ["=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", ">>>=", "|=", "^=", "&="];
        return list[Math.floor(Math.random() * list.length)];
    }

    function genLogicalExpression(deep, choices, excludes, operator, left, right) {
        if(!operator) {
            operator = genLogicalOperator(deep + 1, choices, excludes);
        }
        if(!left) {
            left = genExpression(deep + 1, null, mergeArray(excludes, ['LogicalExpression', 'AssignmentExpression', 'SequenceExpression']));
        }
        if(!right) {
            right = genExpression(deep + 1, null, mergeArray(excludes, ['LogicalExpression', 'AssignmentExpression', 'SequenceExpression']));
        }
        return {"type": "LogicalExpression", "operator": operator, "left": left, "right": right};
    }

    function genLogicalOperator(deep, choices, excludes) {
        var list = ["||", "&&"];
        return list[Math.floor(Math.random() * list.length)];
    }

    function genMemberExpression(deep, choices, excludes, object, property, computed) {
        if(!object) {
            object = genExpression(deep + 1, ['Identifier'], excludes);
        }
        if(!property) {
            property = genExpression(deep + 1, ['Identifier'], mergeArray(excludes, ['FunctionExpression', 'CallExpression', 'AssignmentExpression', 'SequenceExpression']));
        }
        if(undefined === computed) {
            computed = Math.random() > 0.5;
        }
        return {"type": "MemberExpression", "object": object, "property": property, "computed": computed};
    }

    function genConditionalExpression(deep, choices, excludes, test, alternate, consequent) {
        if(!test) {
            test = genExpression(deep + 1, ["Identifier", "MemberExpression", "LogicalExpression"], excludes);
        }
        if(!alternate) {
            alternate = genExpression(deep + 1, ["Identifier", "MemberExpression"], mergeArray(excludes, ['AssignmentExpression']));
        }
        if(!consequent) {
            consequent = genExpression(deep + 1, ["Identifier", "MemberExpression"], mergeArray(excludes, ['AssignmentExpression']));
        }
        return {"type": "ConditionalExpression", "test": test, "alternate": alternate, "consequent": consequent};
    }

    function genCallExpression(deep, choices, excludes, callee, arguments) {
        if(!callee) {
            callee = genExpression(deep + 1, ["Identifier", "MemberExpression"], mergeArray(excludes, ['AssignmentExpression']));
        }
        if(!arguments) {
            arguments = genSequenceExpression(deep + 1, choices, mergeArray(excludes, ['AssignmentExpression']));
        }
        return {"type": "CallExpression", "callee": callee, "arguments": arguments};
    }

    function genNewExpression(deep, choices, excludes, callee, arguments) {
        if(!callee) {
            callee = genExpression(deep + 1, ["Identifier"], mergeArray(excludes, ['AssignmentExpression']));
        }
        if(!arguments) {
            arguments = genSequenceExpression(deep + 1, choices, mergeArray(excludes, ['AssignmentExpression']));
        }
        return {"type": "NewExpression", "callee": callee, "arguments": arguments};
    }

    function genSequenceExpression(deep, choices, excludes, expressions) {
        if(!expressions) {
            expressions = genExpressions(deep + 1, ["Literal"], mergeArray(excludes, ['AssignmentExpression']));
        }
        return {"type": "SequenceExpression", "expressions": expressions};
    }
    
    function mergeArray(a, b) {
        if(a) {
            if(b) {
                return a.concat(b);
            }
            return a;
        }
        return b;
    }

    function log() {
        for(var i = 0, len = arguments.length; i < len; i++) {
            logContent += arguments[i] + ' ';
        }
        logContent += '\n';
        console.log.apply(console, arguments);
    }
}