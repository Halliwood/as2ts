export interface As2TsImportRule {
    /**需要导出为模块的规则 */
    "fromModule"?: {
        /**导出的模块名 */
        "module": string, 
        /**匹配规则，支持正则表达式匹配 */
        "regular": string
    }[]
}

export interface As2TsSkipRule {
    /**需要忽略的文件夹，支持正则表达式匹配 */
    "dirs"?: string[], 
    /**需要忽略的文件，支持正则表达式匹配 */
    "files"?: string[]
}

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

export class Main {
    translateFiles(inputPath: string, outputPath: string, ruleFilePath?: string);
}