## AS2TS

本工具可以帮助你将Actionscript3.0项目完美地转换为TypeScript项目，特别适合于早期使用Laya1.0+AS3开发项目的你。

## 特色

* 批量将ActionScript3.0代码完美翻译成TypeScript代码，解决普通的正则表达式替换无法解决的各类问题
* 智能添加this指针
* 智能导入import
* 支持自定义类型转换

## 比较

* [nshen/as2ts](https://github.com/nshen/as2ts) - 只是简单的正则表达式替换，翻译后会有各种语法问题，无法解决`for each`/`for in`/`new Vector.<int>()`之类的翻译问题，也无法自动添加this指针和import。

## 使用环境

Node.js

## 安装

`npm i as2ts-smart -g`

## 用法

简单模式
```
as2ts-smart -s E:\\asproj\\src\\ --dist E:\\tsproj\\src\\
```

高级模式
```
as2ts-smart -s E:\\asproj\\src\\ --dist E:\\tsproj\\src\\ -r E:\\rule.json
```

### 参数

#### -h, --help 
  输出帮助信息。

#### -s, --src
  必须。待翻译的ActionScript3.0代码目录。

#### --dist
  必须。生成的TypeScript代码输出目录。

#### -m, --module
  可选。将ActionScript3.0的`package`翻译成`module`。

#### -M, --no-module
  可选（默认）。与-m相反。
  
#### -r, --rule
  可选。翻译规则描述文件，as2ts-smart将根据该描述指定的规则进行翻译。

### 使用配置文件自定义翻译规则

as2ts-smart支持你通过配置文件自定义翻译规则，配置文件需要为一个JSON文件。
配置文件的格式定义如下，请参见[As2TsOption](./typings/index.d.ts)

```TypeScript
export interface As2TsOption {
    /**忽略规则 */
    skipRule?: As2TsSkipRule, 
    /**标识符替换规则，不支持正则表达式匹配 */
    idReplacement?: {[raw: string]: string}, 
    /**字面量替换规则，不支持正则表达式匹配 */
    literalReplacement?: {[raw: string]: string}, 
    /**类型映射规则，不支持正则表达式匹配 */
    typeMapper?: {[key: string]: string}, 
    /**方法替换映射规则，不支持正则表达式匹配 */
    methordMapper?: {[key: string]: string}, 
    /**是否生成模块，默认为false */
    module?: boolean, 
    /**模块导入规则 */
    importRule?: As2TsImportRule, 
    /**额外的typescript代码库，用于补充类库信息 */
    tsLibs?: string[], 
    /**是否打印详细的错误信息 */
    errorDetail?: boolean, 
    /**是否在发生错误时立即终止 */
    terminateWhenError?: boolean, 
    /**是否从上次运行处继续翻译 */
    continueLast?: boolean,
    /**临时文件缓存目录 */
    tmpRoot?: string
}
```

#### 配置例子

完整的配置例子，请参见[rule.json](./example/rule.json)
将Laya 1.0+as升级到Laya 2.0+ts的配置例子，请参见[laya1upto2.json](./example/laya1upto2.json)

#### skipRule
  此项用于在翻译时忽略部分文件，其格式定义如下，请参见[As2TsSkipRule](./typings/index.d.ts)

```TypeScript
export interface As2TsSkipRule {
    /**需要忽略的文件夹，支持正则表达式匹配 */
    "dirs"?: string[], 
    /**需要忽略的文件，支持正则表达式匹配 */
    "files"?: string[]
}
```

  比如，假设输入的as3项目目录为`asproj/src`，则下述规则表示不要翻译`asproj/src/ui/*`和`asproj/src/automatic/*`目录下的文件，以及`MsgPool.as`等文件。
  注意，如果使用正则表达式匹配，也要用字符串形式配置，如例子中的`"^\\bui\\b"`，相当于正则表达式`^\bui\b`。
  小提示：`\b`用于匹配单词的边界，关于其详细用法请查找正则表达式资料，以下不详细解释。

```JSON
"skipRule": {
    "dirs": ["^\\bui\\b", "^automatic"], 
    "files": ["FyMsg.as", "DecodeUtil.as", "EncodeUtil.as", "SendMsgUtil.as"]
}
```

#### idReplacement
  此项用于在翻译时将某些标识符（包括变量名、类名、函数名等）进行替换。不支持正则表达式匹配。比如下述规则表示将`KW`替换为`KeyWord`等。

```JSON
"idReplacement": {
    "KW": "KeyWord", 
    "Laya.Component": "Laya.UIComponent", 
    "Laya.RaycastHit": "Laya.HitResult", 
    "Laya.StandardMaterial": "Laya.BlinnPhongMaterial"
}
```

#### literalReplacement
  此项用于在翻译时将某些字面量（包括数值、字符串等）进行替换。不支持正则表达式匹配比如下述规则表示将字符串`automatic/constants/KW`替换为`automatic/constants/KeyWord`。

```JSON
"literalReplacement": {
    "\"automatic/constants/KW\"": "\"automatic/constants/KeyWord\""
}
```

#### typeMapper
  此项用于对某些类型进行自定义替换。下述是as2ts-smart对此项的默认配置，用于对AS3的基本类型进行翻译。
  你只需要配置自己新增的替换项，而不需要重复配置默认替换项。as2ts-smart会将你的自定义配置和默认配置进行合并。

```JSON
{
    "int": "number", 
    "Number": "number", 
    "uint": "number", 
    "Boolean": "boolean", 
    "String": "string", 
    "Object": "any"
}
```

#### methordMapper
  此项用于对某些函数进行自定义替换。下述是as2ts-smart对此项的默认配置，用于对AS3的`trace`方法翻译为TS的`console.log`方法。
  你只需要配置自己新增的替换项，而不需要重复配置默认替换项。as2ts-smart会将你的自定义配置和默认配置进行合并。

```JSON
{
    "trace": "console.log"
}
```

#### module
  此项用于指定是否将AS3中的`package xxx`翻译为`module xxx`，相应的，所有的`import a.b.C;`将会翻译为`import C = a.b.C;`。默认关闭。也可用参数`-m`/`--module`开启。比如如下两个AS3类：

```ActionScript 3.0
// file a/B.as
package a {
    public class B
    {
        //...
    }
}
```

```ActionScript 3.0
// file a/b/C.as
package a.b {
    import a.B;
    public class C extends B
    {
        //...
    }
}
```

默认情况下，将分别翻译为

```TypeScript
// file a/B.ts
module a {
    expport class B
    {
        //...
    }
}
```

```TypeScript
// file a/b/C.ts
module a.b {
    import B = a.B;
    export class C extends B
    {
        //...
    }
}
```

  当`noModule`选项设置为`true`时，则翻译为
  
```TypeScript
// file a/B.ts
expport class B
{
    //...
}
```

```TypeScript
// file a/b/C.ts
import {B} from '../B';
export class C extends B
{
    //...
}
```

#### importRule
  此项用于将AS的包按照指定的规则以TS模块的形式进行导入，并去除原先的import语句。其格式定义如下，请参见[As2TsImportRule](./typings/index.d.ts)。
  
```TypeScript
export interface FromModule {
    /**导入的模块名 */
    "module": string, 
    /**匹配规则，支持正则表达式匹配 */
    "regular": string, 
    /**模块名需要另外import的路径*/
    "import"?: string
}

export interface As2TsImportRule {
    /**需要以模块形式进行import导入的规则 */
    "fromModule"?: FromModule[]
}
```
  
  下述例子的第一个配置即是对AS中的`laya.*`等进行翻译的应用。它将会把`laya.utils.Handler`和`laya.ui.Image`之类的翻译成`Laya.Handler`和`Laya.Image`。
  对于某些需要import的模块，比如Laya2.0中ui类的使用，可以配置`import`项进行import。

```JSON
"importRule": {
    "fromModule": [
        {"module": "Protocol", "regular": "^automatic/protocol/(?!Macros|ErrorId)" }, 
        {"module": "GameConfig", "regular": "^automatic/cfgs/(?!ConfigDecoder)" }, 
        {"module": "Laya", "regular": "^laya/" }, 
        {"module": "ui", "regular": "^ui/", "import": "ui/layaMaxUI" }
    ]
}
```

#### tsLibs
  as2ts-smart在翻译时会通过分析AS代码得到类与类之间的继承关系，进而实现对AS中常见的this指针缺省现象进行智能添加。但有时候输入的AS项目中并不能提供最完整的信息，会导致as2ts-smart无法判定某些标识符是否需要添加this指针。比如，有些类型的是由第三方SDK定义的，这时你可以将第三方SDK的`.d.ts`文件配置于此项。比如，下述例子可以让as2ts-smart获得Laya SDK的相关信息。

```JSON
"tsLibs": ["E:/qhgame/tsproj/libs/LayaAir.d.ts", "E:/qhgame/tsproj/libs/layaAir.minigame.d.ts", "E:/qhgame/tsproj/src/ui/layaMaxUI.ts"]
```

#### errorDetail
  开启此项，当发生错误时as2ts-smart将输出更详尽的信息方便定位问题。

#### terminateWhenError
  开启此项，当发生错误时as2ts-smart将停止继续翻译。

#### continueLast
  开启此项，as2ts-smart将从上一次翻译中断的文件继续翻译。

#### tmpRoot
  设置as2ts-smart的工作临时目录，默认为`{CURRENTDIRECTORY}/tmp`。

## 已知问题

### 内联函数
  暂不支持内联函数的翻译。如果AS代码中存在内联函数，可能导致转换时发生错误。请尽量避免使用类似下述的写法：

```as3
private function doSomething(): void {
    // 以下调用了一个内联函数
    doSomethingInner();
    // 不要使用此类内联函数
    function doSomethingInner(): void {
        // ...
    }
}
```

## 使用许可

ISC

## 作者

[Github](https://github.com/Halliwood/) | [npm](https://www.npmjs.com/~taiyosen) | [QQ](http://wpa.qq.com/msgrd?v=3&uin=501251659&site=qq&menu=yes)

## 鼓励作者继续改善
[1元助力](http://jd.res.fygame.com/testurl/jwcKorea/assets/android/donate.jpg)