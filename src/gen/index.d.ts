export interface As2TsImportRule {
    "fromModule"?: {
        "module": string, 
        "regular": RegExp
    }[]
}

export interface As2TsSkipRule {
    "dirs"?: RegExp[], 
    "files"?: RegExp[]
}

export interface As2TsOption {
    skipRule?: As2TsSkipRule, 
    idReplacement?: {[raw: string]: string}, 
    literalReplacement?: {[raw: string]: string}, 
    typeMapper?: {[key: string]: string}, 
    methordMapper?: {[key: string]: string}, 
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