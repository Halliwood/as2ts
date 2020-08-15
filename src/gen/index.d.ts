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
    importRule?: As2TsImportRule
}