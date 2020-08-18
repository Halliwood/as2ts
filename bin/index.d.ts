// Type definitions for bin/index.js
// Project: [LIBRARY_URL_HERE] 
// Definitions by: [YOUR_NAME_HERE] <[YOUR_URL_HERE]> 
// Definitions: https://github.com/borisyankov/DefinitelyTyped
declare namespace optionExample.importRule.fromModule.0{
	// optionExample.importRule.fromModule.0
	
	/**
	 * 
	 */
	interface 0 {
				
		/**
		 * 
		 */
		module : string;
				
		/**
		 * 
		 */
		regular : string;
	}
}
declare namespace optionExample.importRule.fromModule.1{
	// optionExample.importRule.fromModule.1
	
	/**
	 * 
	 */
	interface 1 {
				
		/**
		 * 
		 */
		module : string;
				
		/**
		 * 
		 */
		regular : string;
	}
}
declare namespace optionExample.importRule.fromModule.2{
	// optionExample.importRule.fromModule.2
	
	/**
	 * 
	 */
	interface 2 {
				
		/**
		 * 
		 */
		module : string;
				
		/**
		 * 
		 */
		regular : string;
	}
}
declare namespace optionExample.importRule.fromModule.3{
	// optionExample.importRule.fromModule.3
	
	/**
	 * 
	 */
	interface 3 {
				
		/**
		 * 
		 */
		module : string;
				
		/**
		 * 
		 */
		regular : string;
	}
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
		export var dirs : Array<string>;
				
		/**
		 * 
		 */
		export var files : Array<string>;
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
}
