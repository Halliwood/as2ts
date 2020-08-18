// Type definitions for ./index.js
// Project: [LIBRARY_URL_HERE] 
// Definitions by: [YOUR_NAME_HERE] <[YOUR_URL_HERE]> 
// Definitions: https://github.com/borisyankov/DefinitelyTyped

/**
 * 
 */
declare var As2TsPhase : {
		
	/**
	 * 
	 */
	Analyse : number;
		
	/**
	 * 
	 */
	Make : number;
}

/**
 * 
 */
declare var DefaultTypeMapper : {
		
	/**
	 * 
	 */
	int : string;
		
	/**
	 * 
	 */
	Number : string;
		
	/**
	 * 
	 */
	uint : string;
		
	/**
	 * 
	 */
	Boolean : string;
		
	/**
	 * 
	 */
	String : string;
		
	/**
	 * 
	 */
	Object : string;
}

/**
 * 
 */
declare var DefaultMethordMapper : {
		
	/**
	 * 
	 */
	trace : string;
}

/**
 * 
 */
declare namespace optionExample{
	
	/**
	 * 
	 */
	namespace skipRule{
				
		/**
		 * 
		 */
		export var dirs : Array<RegExp>;
				
		/**
		 * 
		 */
		export var files : Array<RegExp>;
	}
	
	/**
	 * 
	 */
	var idReplacement : {
				
		/**
		 * 
		 */
		KW : string;
	}
	
	/**
	 * 
	 */
	var literalReplacement : {
				
		/**
		 * 
		 */
		"automatic/constants/KW" : string;
	}
	
	/**
	 * 
	 */
	namespace importRule{
				
		/**
		 * 
		 */
		export var fromModule : Array</* optionExample.importRule.fromModule.0,optionExample.importRule.fromModule.1,optionExample.importRule.fromModule.2,optionExample.importRule.fromModule.3 */ any>;
	}
		
	/**
	 * 
	 */
	export var tsLibs : Array<string>;
		
	/**
	 * 
	 */
	export var errorDetail : boolean;
		
	/**
	 * 
	 */
	export var terminateWhenError : boolean;
		
	/**
	 * 
	 */
	export var continueLast : boolean;
		
	/**
	 * 
	 */
	export var tmpRoot : string;
	
	/**
	 * 
	 */
	var typeMapper : {
				
		/**
		 * 
		 */
		int : string;
				
		/**
		 * 
		 */
		Number : string;
				
		/**
		 * 
		 */
		uint : string;
				
		/**
		 * 
		 */
		Boolean : string;
				
		/**
		 * 
		 */
		String : string;
				
		/**
		 * 
		 */
		Object : string;
	}
	
	/**
	 * 
	 */
	var methordMapper : {
				
		/**
		 * 
		 */
		trace : string;
	}
}

/**
 * 
 */
export declare var inputFolder : string;

/**
 * 
 */
export declare var outputFolder : string;

/**
 * 
 */
export declare var lastConfPath : string;

/**
 * 
 */
export declare var tmpTsDir : string;

/**
 * 
 */
export declare var tmpAstDir : string;

/**
 * 
 */
export declare var continueLast : boolean;

/**
 * 
 */
export declare var hasMeetLast : boolean;

/**
 * 不支持内联函数、函数语句、单行声明多个成员变量
 * @param inputPath 
 * @param outputPath 
 * @param option 
 */
declare function translateFiles(inputPath : string, outputPath : string, option : /* optionExample */ any): void;

/**
 * 
 * @param dirPath 
 * @param phase 
 */
declare function readDir(dirPath : string, phase : number): void;

/**
 * 
 * @param filePath 
 * @param phase 
 */
declare function doTranslateFile(filePath : string, phase : number): void;

/**
 * 
 * @param dirPath 
 */
declare function readLibDir(dirPath : string): void;

/**
 * 
 * @param filePath 
 */
declare function readLibFile(filePath : string): void;

/**
 * 
 */
declare function dumpAnalysor(): void;

/**
 * 
 * @param a 
 * @param b 
 * @return  
 */
declare function mergeOption(a : /* optionExample.typeMapper */ any | /* optionExample.methordMapper */ any, b : /* DefaultTypeMapper */ any | /* DefaultMethordMapper */ any): any;

/**
 * 
 */
export declare var transOption : /* optionExample */ any;
