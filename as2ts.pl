##
#
# 将ActionScript代码转换为TypeScript代码。
# 使用时，需提供如下参数：
# 1. 源代码路径
# 2. 生成的ts代码保存路径
#
# author teppei
# date 2020/8/5
#
##

use threads ('yield','stack_size' => 64*4096,'exit' => 'threads_only','stringify');
use threads::shared;

use Time::HiRes qw( usleep );

use Data::Dumper;
use Encode;
use File::Basename;
use File::Path;
use POSIX;
use XML::Simple;

use utf8;
#use encoding "utf8", STDOUT => 'gbk';  # 多线程的print会报错，故注释掉

my ($_srcPath, $_outPath) = @ARGV;

# 检查参数 - 代码源路径
(defined $_srcPath) or die('ERROR: [main] _srcPath not defined!');
(-e $_srcPath) or die("ERROR: [main] $_srcPath not exist!");

# 检查参数 - 输出路径
(defined $_outPath) or die('ERROR: [main] _outPath not defined!');

my $hour_min_sec=strftime("%H:%M:%S", localtime());
print "[$hour_min_sec] start converting, please wait...\n";

my $fileCnt:shared = 0;
my $crtFile:shared;
my $allDone:shared = 0;
my $updateMsg:shared = 0;

sub displayMsg
{
	select(STDOUT);
	$|=1;
	while(1) {
		{
			lock($updateMsg);
			if(1 == $updateMsg) {
				lock($fileCnt);
				lock($crtFile);
				print "file $fileCnt: ".makeWidthStr($crtFile, 100)."\r";  # 生成100长度字串，否则字符串长度不一样的话输出会有残留显示
				$updateMsg = 0;
			}
		}
		lock($allDone);
		if(1 == $allDone) {
			print "\n";
			last;
		}
	}
}

##
# 生成指定长度的字串
##
sub makeWidthStr
{
	my $input = shift;
	my $width = shift;
	my $sw = length($input);
	if($sw > $width) {
		$input = substr(0, $width);
	} elsif($sw < $width) {
		$width -= $sw;
		while($width > 0) {
			$input.=' ';
			$width--;
		}
	}
	return $input;
}

my $t=threads->create(\&displayMsg);

# 开始扫描目录文件
scanRecuisively($_srcPath);

{
	lock($allDone);
	$allDone = 1;
}
$t->join();

{
	lock($fileCnt);
	print "$fileCnt actionscript file processed!\n";
}
$hour_min_sec=strftime("%H:%M:%S", localtime());
print "[$hour_min_sec] Conversion finished!\n";

exit 0;

##
# 递归检查目录
##
sub scanRecuisively
{
	my $input = shift;
	
	# 检查是否目录
	if(-d $input)
	{
		# 输入是目录
		# 过滤掉协议目录和表格结构目录
		if(checkSkipDir($input))
		{
			return;
		}
		
		opendir DH,$input or die("ERROR: [scanRecuisively] Please check the path: $input\n");
		foreach(readdir DH){
			next if($_ eq '.' || $_ eq '..');
			
			my $curPath = $input."/$_";
			if(-d $curPath)
			{
				# 还是目录
				next if(checkSkipDir($_));
				
				scanRecuisively($curPath);
			}
			elsif(!checkSkipFile($_))
			{
				scanFile($curPath);
			}
		}
		closedir DH;
	}
	elsif(!checkSkipFile($curPath))
	{
		scanFile($input);
	}
}

##
# 检查是否跳过dir
##
sub checkSkipDir
{
	my $input=shift;
	return ($input =~ /^ui\// || $input =~ /^automatic/);
}

##
# 检查是否跳过file
##
sub checkSkipFile
{
	my $input=shift;
	return ($input !~ /ActHomeView\.as/ || $input =~ /MsgPool\.as/ || $input =~ /FyMsg\.as/ || $input =~ /DecodeUtil\.as/ || $input =~ /EncodeUtil\.as/);
}

##
# 扫描文件
##
sub scanFile
{
	my $file=shift;
	
	{
		lock($fileCnt);
		$fileCnt++;
		lock($crtFile);
		$crtFile = $file;
		lock($updateMsg);
		$updateMsg = 1;
    }
	
	# 打开文件并逐行扫描
	open ( INFILE, '<:encoding(utf-8)', $file ) or die ("ERROR: [scanFile] Can't open $file - $!\n");
	my @contents=<INFILE>;
	close INFILE;	
	
	my $totalLineNum = scalar(@contents);	
	
	my @tsContents = ();
	my $i, my $j, my $line;
    my %importedMap = ();
	my %classScopeMap = ();  # 可能一个文件里声明了多个类，记录[类名 - (起始行，终止行)]
	my $className;
	my $hasParent = 0;
	my $var_1, my $var_2, my $var_3, my $var_4, my $var_5, my $var_6;
	my $var_s1, my $var_s2, my $var_s3;
	my $propertyKey;
	my %propertiesMap = ();  # 记录[类名+成员变量名 - 非静态1，静态2]
	my $funcKey;
	my %funcMap = ();  # 记录[类名+成员函数名 - 函数变量数组]
	my %staticFuncMap = ();  # 记录静态函数
	
	my $funcName;
	my $inFunc = 0;  # 是否在函数体内
	my $inFuncName;  # 当前在哪个函数体内
	my %funcScopeMap = ();  # 记录[成员函数 - (起始行，终止行)]
	my $isParamsComplete = 1;
    my $isEnum = 1;
	
	my @protocolStructs = ();  # 记录协议结构
	my @configStructs = ();  # 记录表格结构
	
	my $packageBraceFlag = 0;  # 标记package的花括号状态
	my $pflag = 0;
	
	# 下面开始代码替换
	for($i = 0; $i < $totalLineNum; $i++) {
		# 跳过package，这里不考虑内部类的情况
		#next ;
		$line = $contents[$i];
		# 去掉末尾的两个;;的情况
		$line =~ s/;{2,}(\s*)$/;$1/;

		if($line =~ /^\s*\/\// || $line =~/^\s*\/\*\*/ || $line =~ /^\s*\*/) {
		# 注释掉的不管
		} elsif($line =~ /^package/) {
			# package去掉
			if($line =~ /\{\s+$/) {
				$packageBraceFlag = 2;  # 剩下右花括号
			} else {
				$packageBraceFlag = 1;
			}
			$line = '';
		} elsif(1 == $packageBraceFlag && $line =~ /^\{\s+/) {
			# 紧跟package的花括号
			$packageBraceFlag = 2;  # 剩下右花括号
			$line = '';
		} elsif($line =~ /\s*import\s+(\S+)\s?;/) {
			# 转换import
			$inFunc = 0;

			$var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改

			# 先把用到的协议结构记录下来
			if($var_1 =~ /^automatic\.protocol\.(\S+)$/ && 'Macros' ne $1 && 'ErrorId' ne $1 && 'DecodeUtil' ne $1 && 'EncodeUtil' ne $1 && '*' ne $1) {
				push @protocolStructs, $1;
			}
			# 把用到表格结构也记录下来
			if($var_1 =~ /^automatic\.cfgs\.(\S+)$/) {
				if('*' ne $1) {
					push @configStructs, $1;
				}	      
			}

			if(noImport($var_1)) {
				$line = "\n";
			} else {
				my @importArr = split(/\./, $var_1);
				my $importedClassName = $importArr[scalar(@importArr) - 1];
				if(exists $importedMap{$importedClassName}) {
					# 已经import过了
					$line = "\n";
				} else {
					$importedMap{$importedClassName} = 1;
					if($var_1 =~ /^laya./) {
						$line = "import $importedClassName = Laya.$importedClassName;\n";
					} elsif($var_1 =~ /^ui./) {
						$line = "import $importedClassName = ui.$importedClassName;\n";
					} else {
						# Dictionary等不需要import
						$line = "import {$importedClassName} from '".join('/', @importArr)."\'\n";
					}
				}	      
			}            
		} elsif($line =~ s/^\s*(?:public )?(?:final )?(class |interface )\s*(\w+)/export $1 $2/) {
			# 转换class声明
			$inFunc = 0;

			$var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改
			$var_2 = $2;

			if(defined $className) {
				# 标记上一个类的结束行
				my $lastClassScopeArr = $classScopeMap{$className};
				@$lastClassScopeArr[1] = $i - 1;

				if(2 == $packageBraceFlag) {
					# 第一个类定义结束了，把package的右花括号去掉
					my $tmpLine;
					my $tsContentsLen = scalar(@tsContents);
					for($j = $tsContentsLen - 1; $j >= 0; $j--) {
						$tmpLine = $tsContents[$j];
						if($tmpLine =~ /^}\s+/) {
							$tsContents[$j] = '';
							last;
						}
					}
					$packageBraceFlag = 0;
				}
			}
			# 标记起始行
			$className = $var_2;
			my @classScopeArr = ($i, $i);
			$classScopeMap{$className} = [@classScopeArr];
			if($line =~ / extends /) {
				$hasParent = 1;
				$isEnum = 0;
			}

		} elsif($line =~ /\s*(public|protected|private)\s+(static )?(const |var )\s?(\w+)(.*)/g) {
			# 转换成员变量声明
			$inFunc = 0;

			$var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改
			$var_2 = $2;
			$var_3 = $3;
			$var_4 = $4;
			$var_5 = $5;

			if($var_5 =~ /:\s?([^\s=;]+)(.*)/){
				# 有类型声明
				$var_5 = $1;
				$var_6 = $2;
			} else {
				# 没有类型声明
				$var_6 = $var_5;
				$var_5 = '';
			}

			if(defined $inFuncName) {
				# 标记函数体结束行
				my $lastFuncScopeArr = $funcScopeMap{$inFuncName};
				@$lastFuncScopeArr[1] = $i - 1;
				undef $inFuncName;
			}

			$line = 'public' eq $var_1 ? '' : $var_1.' ';
			$propertyKey = $className.'+'.$var_4;
			if(defined $var_2 && 'static ' eq $var_2){
				$line.='static ';
				$propertiesMap{$propertyKey} = 2;
			} else {
				$propertiesMap{$propertyKey} = 1;
			}
			my $memberTsType = asType2tsType($var_5);
			if($memberTsType ne 'number') {
				$isEnum = 0;
			}
			$line.=$var_4;
			if('' ne $memberTsType) {
				$line.=': '.$memberTsType;
			}
			# 翻译初始化
			if($var_6 !~ /\s*=\s*['|"]/ and $var_6 =~ /\s*=\s*(.+);+/) {
				$line.=' = '.asInit2tsInit($1).';';
			} else {
				# number类型自动初始化为0
				if('number' ne $var_5 && 'number' eq $memberTsType) {
					$line.=' = 0';
				} elsif('boolean' ne $var_5 && 'boolean' eq $memberTsType){
					$line.=' = false';
				}
				$line.=$var_6;
			}
			$line.="\n";
		} elsif($line =~ /(.*)(?:static |override )?(public |protected |private )(static |override )?function ([^\(]+)\(([^\)]*\)?)(?:\s?:\s?([^\s\{]+))?(.*)/) {
			# 转换成员函数
			$inFunc = 1;
			$isEnum = 0;

			$var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改
            $var_2 = $2;
			$var_3 = $3;
			$var_4 = $4;
			$var_5 = $5;
			$var_6 = $6;
			$var_7 = $7;

			# 检查是否getter/setter
			my $getterSetter = 0;  # 1是getter，2是setter
			if(defined $className && $className eq $var_4) {
				# 这是构造函数，名字改成constructor
				$funcName = 'constructor';
			} elsif($var_4 =~ /(get|set) (.*)/) {
				# getter/setter
				$getterSetter = 'get' eq $1 ? 1 : 2;
				$funcName = $2;
				# 当成属性处理，这样后面会加上this
				$propertiesMap{$className.'+'.$funcName} = 1;
			} else {
				$funcName = $var_4;
			}

			# 标记进入函数体
			if(!(defined $inFuncName) || $inFuncName ne $funcName) {
				if(defined $inFuncName) {
					# 标记函数体结束行
					my $lastFuncScopeArr = $funcScopeMap{$inFuncName};
					@$lastFuncScopeArr[1] = $i - 1;
				}
				$inFuncName = $funcName;
			}
			$funcKey = (defined $className ? $className : '').'+'.$funcName;
			my @funcParamNameArr = ();
			$funcMap{$funcKey} = [@funcParamNameArr]; # 保存成员函数信息

            # 有的函数结尾右括号没有换行，紧接着下一个函数
			$var_1 =~ s/override\s+//;
			$line = $var_1;
			if('constructor' ne $funcName) {
				$line.='public ' eq $var_2 ? '' : $var_2;
				if(defined $var_3 && 'static ' eq $var_3){
					$line.='static ';
					$staticFuncMap{$funcKey} = 1;  # 标记为静态函数
				}
				$line.=$var_4.'(';
			} else {
				$line.='constructor(';
			}

			$isParamsComplete = 1;
			if('' ne $var_5) {
				# 可能换行
				if($var_5 =~ s/\)$//) {
					# 标记函数体起始行
					my @funcScopeArr = ($i, -1);
					$funcScopeMap{$funcName} = [@funcScopeArr];
				} else {
					$isParamsComplete = 0;
				}
				# 转换参数列表
				$line = processFuncParams($var_5, $funcMap{$funcKey}, $line);
			}
			if($isParamsComplete == 1) {
				$line.=')';
			}
			if(2 != $getterSetter && defined $var_6 && '' ne $var_6 && 'constructor' ne $inFuncName) {
				$line.=': '.asType2tsType($var_6);
			}      
			$line.=$var_7."\n";
			if($var_7 =~ /^\{.*\}$/) {
				# 单行函数
				print("single line func: $inFuncName\n");
			}
		} elsif($inFunc == 1 && $isParamsComplete == 0 && $line=~/(\s*,?\s*)([^\)]*\)?)(?:\s?:\s?([^\s\{]+))?(.*)/) {
			$var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改
			$var_2 = $2;
			$var_3 = $3;
			$var_4 = $4;

			if($var_2 =~ s/\)$//) {
				$isParamsComplete = 1;
				# 标记函数体起始行
				my @funcScopeArr = ($i, -1);
				$funcScopeMap{$funcName} = [@funcScopeArr];
			}
			my $funcParamNameArr = $funcMap{(defined $className ? $className : '').'+'.$inFuncName};
			$line = $var_1.processFuncParams($var_2, $funcParamNameArr, '');
			if($isParamsComplete == 1) {
				$line.=')';
				if(defined $var_3 && '' ne $var_3 && 'constructor' ne $inFuncName) {
					$line.=': '.asType2tsType($var_3);
				}      
				$line.=$var_4."\n";
			}
		} elsif($line =~ /(.*)(?<=[\s\(;])var ([^;]+)(.*)/) {
			# 转换局部变量
			$var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改
			$var_2 = $2;
			$var_3 = $3;   

			$isEnum = 0;
			my $varStr = '';
			# 考虑一行声明多个变量的情形，如果以,分割变量实际上有bug，比如var a: int = Math.max(1, 0), b: int = 2; 或者var c = [1, 2, 3];
			# 因此有一个简单的方法即检查括号是否匹配，否则可认定该,是用于参数分割，当然还是有个别特殊情形有问题，比如括号是用于字符串，但应该不常出现就不管了，因为大部分情况下括号是用于函数调用
			my @tmpVarArr = split(/\s?,\s?/, $var_2);  
			my $varUnit;
			my $tmpVarArrLen = scalar(@tmpVarArr);
			my @varArr = ();
			my $varUnitBraceWaitCount = 0;
			my $varUnitMerged = '';
			for($j = 0; $j < $tmpVarArrLen; $j++) {
				$varUnit = $tmpVarArr[$j];
				my $tmpLeftBraceCount = countStr($varUnit, '(');
				my $tmpRightBraceCount = countStr($varUnit, ')');

				if($varUnitBraceWaitCount > 0) {
					$varUnitMerged.=', '.$varUnit;
					$varUnitBraceWaitCount -= ($tmpRightBraceCount - $tmpLeftBraceCount);
					if($varUnitBraceWaitCount <= 0) {
						push @varArr, $varUnitMerged;
						$varUnitMerged = '';
						$varUnitBraceWaitCount = 0;
					} else {
						# 右括号还不够
					}          
				} else {
					if($tmpLeftBraceCount <= $tmpRightBraceCount) {
						# 右括号跟左括号匹配
						push @varArr, $varUnit;
						$varUnitMerged = '';
					} else {
						# 左右括号不匹配，需要等候
						$varUnitMerged = $varUnit;
						$varUnitBraceWaitCount = $tmpLeftBraceCount - $tmpRightBraceCount;
					}
				}        
			}

			if('' ne $varUnitMerged) {
				push @varArr, $varUnitMerged;
			}

			foreach $varUnit (@varArr) {
				if('' ne $varStr) {
					$varStr.=', ';
				}
				# $varUnit =~ /(\w+)\s?:?\s?(\w*)(.*)/;
				# $var_s1 = $1;
				# $var_s2 = $2;
				# $var_s3 = $3;
				$var_s1 = '';
				$var_s2 = '';
				$var_s3 = '';

				my $varDeclare = $varUnit;
				my $assignPos = index($varUnit, '=');
				if($assignPos > 0) {
					$var_s3 = substr($varUnit, $assignPos + 1);
					$varDeclare = substr($varUnit, 0, $assignPos);
				}
				my $typePos = index($varDeclare, ':');
				if($typePos > 0) {
					$var_s1 = substr($varDeclare, 0, $typePos);
					$var_s2 = substr($varDeclare, $typePos + 1);
				} else {
					$var_s1 = $varDeclare;
				}

				$varStr.=$var_s1;
				my $tmpTsType = '';
				if('' ne $var_s2) {
					# 有类型
					$var_s2 = trim($var_s2);
					$tmpTsType = asType2tsType($var_s2);
					$varStr.=': '.$tmpTsType;
				}
				if('' ne $var_s3) {
					# 有初始化
					$var_s3 = trim($var_s3);
					$varStr.=' = '.asInit2tsInit($var_s3);
				} else{
					if($tmpTsType) {
						# number类型自动初始化为0
						if('number' ne $var_s2 && 'number' eq $tmpTsType) {
							$varStr.=' = 0';
						} elsif('boolean' ne $var_s2 && 'boolean' eq $tmpTsType) {
							$varStr.=' = false';
						}
					}
					$varStr.=$var_s3;
				}
				# 如果当前在成员函数内，将临时变量保存起来
				if(1 == $inFunc && defined $inFuncName) {
					my $funcParamNameArr = $funcMap{(defined $className ? $className : '').'+'.$inFuncName};
					push @$funcParamNameArr, $var_s1;
				}
			}
			$line=$var_1.'let '.$varStr.$var_3."\n";
		} elsif($line =~ /(.*)=\s*(new [^;\r\n]+)(.*)/) {
			# 成员变量初始化
			$var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改
			$var_2 = $2;
			$var_3 = $3;  
			$line = $var_1.' = '.asInit2tsInit($var_2).$var_3."\n";
		}

		push @tsContents, $line;
	}	

	# 下面开始给成员变量和函数加this
	foreach $funcKey (keys %funcMap) {
		# 按照类名+函数名解开
		$funcKey =~ /([^\+]+)\+(.*)/;  
		$className = $1;
		$funcName = $2;

		# 取出函数的范围
		my $funcScopeArr = $funcScopeMap{$funcName};
		my $funcStart = @$funcScopeArr[0];
		my $funcEnd = @$funcScopeArr[1];
		if($funcEnd == -1) {
			$funcEnd = $totalLineNum - 1;
		}

		my $funcParamNameArr = $funcMap{$funcKey};
		my $funcParamCount = scalar(@$funcParamNameArr);
		my $funcLine, my $thisStr;

		# 先处理成员变量
		foreach $propertyKey (keys %propertiesMap) { 
			# 按照类名+属性名解开
			$propertyKey =~ /([^\+]+)\+(.*)/;  
			my $tmpClassName = $1;
			next if($tmpClassName ne $className);  # 如果是其他类的属性，那肯定已经带了前缀了无需修改
			my $property = $2;

			my $sameAsFuncParam = 0;
			for($i = 0; $i < $funcParamCount; $i++) {
				if(@$funcParamNameArr[$i] eq $property) {
					$sameAsFuncParam = 1;
					last;
				}
			}
			next if(1 == $sameAsFuncParam); # 这个成员变量与函数内部变量或参数变量重复

			# 静态使用类名，否则使用this
			$thisStr = 2 == $propertiesMap{$propertyKey} ? $className : 'this';

			for($i = $funcStart + 1; $i <= $funcEnd; $i++) {
				$funcLine = $tsContents[$i];
				$funcLine =~ s/(?<![\.\w\d_])\Q$property\E(?=[\W])/$thisStr.$property/g;  # 除了 . 字母 数字 _ 开头的需要加上this，且后面不带 字母 数字 _
				$tsContents[$i] = $funcLine;
			}
		}
  	
		# 再处理成员函数
		foreach my $otherFuncKey (keys %funcMap) {  
			# next if($otherFuncKey eq $funcKey);
			# 按照类名+函数名解开
			$otherFuncKey =~ /([^\+]+)\+(.*)/;  
			my $otherFuncClass = $1;
			next if(!defined $otherFuncClass || $otherFuncClass ne $className);  # 如果是其他类的函数，那肯定已经带了前缀了无需修改
			my $otherFuncName = defined $2 ? $2 : $otherFuncClass;  # 有些文件是没有类的，比如assert

			# 静态使用类名，否则使用this
			$thisStr = (exists $staticFuncMap{$otherFuncKey}) ? $className : 'this';

			for($i = $funcStart + 1; $i <= $funcEnd; $i++) {
				$funcLine = $tsContents[$i];
				$funcLine =~ s/(?<![\.\w\d_])\Q$otherFuncName\E(?=[\.\(;])/$thisStr.$otherFuncName/g;  # 除了 . 字母 数字 _ 开头的需要加上this，且必须跟上 . ( ;
				$tsContents[$i] = $funcLine;
			}	  	  
		}	    	
	}
	
	# 再次检查去掉package的右括号
	if(2 == $packageBraceFlag) {
		my $tmpLine;
		my $tsContentsLen = scalar(@tsContents);
		for($j = $tsContentsLen - 1; $j >= 0; $j--) {
			$tmpLine = $tsContents[$j];
			if($tmpLine =~ /^\}/) {
				$tsContents[$j] = '';
				last;
			}
		}
		$packageBraceFlag = 0;
	}
	
	my $allTsContents = join('', @tsContents);
      
    # 检查父类是否有import，ts同一个目录下也要import
    if($allTsContents =~ /class (\w+) extends (\w+)/) {
		my $parentClass = $2;
		if(!exists $importedMap{$parentClass}) {
			$importParentPath = substr($file, length($_srcPath) + 1);
			$importParentPath = substr($importParentPath, 0, rindex($importParentPath, '/'))."/$parentClass";
			$allTsContents = "import {$parentClass} from '$importParentPath'\n".$allTsContents;
		}
    }

	# 有父类的构造函数必须super
	if($hasParent == 1) {
		$allTsContents =~ s/constructor\(([^\)]*)\)([^\{]*)\{(?!\s*super\()/constructor($1)$2\nsuper();\n/;
	}

	# 检查import Global

    
    # 枚举类class改成enum
    if($isEnum) {
		$allTsContents =~ s/(?!<\S)class(?=\s)/enum/g;
		$allTsContents =~ s/static //g;
		$allTsContents =~ s/: number//g;
		$allTsContents =~ s/;/,/g;
    }
    
	# 由于getter和setter现在scope重合在一起没有区分开，可能导致其中一个出现this.xxx的现象，处理一下
	$allTsContents =~ s/(?!<\w)set this\.(?=\w+\()/set /g;
	$allTsContents =~ s/(?!<\w)get this\.(?=\w+\()/get /g;

	# 去掉可能遗漏的function关键字，比如interface里的
	$allTsContents =~ s/(?!<\w)function //g;
    # 去掉__JS__()
    $allTsContents =~ s/__JS__\(['|"](.+)['|"]\)/$1/g;
	
	# for each 换成 for of
	$allTsContents =~ s/for each\s?\(\s?(?:var|let)\s+([^:]+)(?::\s?[\w|\.|<|>]+)?\s+in /for (let $1 of /g;
	$allTsContents =~ s/for each\s?\(\s?([^:\s]+)(\s?:\s?[\S]+)? in /for ($1 of /g;
	
	# for in去掉类型声明
	$allTsContents =~ s/for\s?\(\s?let ([^:\s]+)\s?:\s?\S+ in/for (let $1 in/g;

	# 补上this
	$allTsContents =~ s/Handler\.create\((\w+),\s?(?!(\1|function|\s))/Handler.create($1, $1./g;
	$allTsContents =~ s/on\(Event\.(\w+),\s?this,(?!\s?(this|function))/on(Event.$1, this, this./g;
	$allTsContents =~ s/loop\((\w+),\s?this,\s?(?!\s?(this|function))/loop($1, this, this./g;
	
	# 协议发送
	$allTsContents =~ s/m_netModule(?=\.sendMsg)/G.ModuleMgr.netModule/g;
	if($allTsContents =~ s/Protocol(?=\.get)/ProtocolUtil/g) {
		$needProtocolUtil = 1;
	}
	
	# 转换协议结构
	foreach my $pstruct (@protocolStructs) {
		$allTsContents =~ s/(?<![\.\w])\Q$pstruct\E(?![\w_])/Protocol.$pstruct/g;
	}
	
	if($allTsContents =~ s/MsgPool\.instance\.GetEncodeMsg\(Macros\.MsgID_(\w+)\)/SendMsgUtil.get$1()/g) {
		$allTsContents = "import {SendMsgUtil} from 'automatic/protocol/SendMsgUtil'\n".$allTsContents;
	}
	
	# FyMsg一般是在协议响应函数里，因为ts里面使用body作为参数了，不好脚本转换，改成XXX方便手工转换
	$allTsContents =~ s/msg\s?:\s?FyMsg(?=\))/body: Protocol.XXX/g;
	# FyMsg改成Protocol.FyMsg
	$allTsContents =~ s/(?<![\.\w])FyMsg/Protocol.FyMsg/g;

	# 修复可能出现let this.xxx的情况
	$allTsContents =~ s/(?<=let )this\.//g;

	# 去掉as
	# $allTsContents =~ s/ as Array(?!\w)//g;
	$allTsContents =~ s/ as [\w|\.|<|>|\[|\]]+//g;

	# is改instanceof
	$allTsContents =~ s/if\s?\((\S+)\s+is\s+(\S+)\)/if($1 instanceof $2)/g;
	
	# 转换表格结构
	foreach my $cfgStruct (@configStructs) {
		$allTsContents =~ s/(?<![\w_\.])\Q$cfgStruct\E(?![\w_])/GameConfig.$cfgStruct/g;
	}
	
	$allTsContents =~ s/System\/net\/FyProtocol\/Macros/System\/protocol\/Macros/g;
	$allTsContents =~ s/System\/utils\/keyword\/KeyWord/System\/constants\/KeyWord/g;

	# trace 改 console.log
	$allTsContents =~ s/(?<![\w\.])trace(?=\()/console.log/g;

	# Vector.<xx> 改 xx[]
	$allTsContents =~ s/(?!<\w)Vector\./Array/g;
	$allTsContents =~ s/new Array<([\w|\.]+)>;/new Array<$1>();/g;
	
	# Number 改 number
	$allTsContents =~ s/(?<!\w)Number(?![\w|\(])/number/g;
	# String 改 string
	$allTsContents =~ s/(?<!\w)String(?!\w)/string/g;
	# Boolean 改 boolean
	$allTsContents =~ s/(?<!\w)String(?!\w)/string/g;

	# KW改KeyWord
	$allTsContents =~ s/(?<!\w)KW(?!\w)/KeyWord/g;
	
	# 针对枚举
	if($file =~ /Enum\w+\.as$/) {
		$allTsContents =~ s/static ([\w\d_]+): number = (\d+);/$1 = $2, /g;
	}
	
	# 将注释转换为单行
	$allTsContents =~ s/\/\*\*\s+\*\s?(\S+)\s+\*\//\/**$1*\//g;
	
	# 字符串替换成单引号
	# $allTsContents =~ s/(?<!\\)"([^"]*)(?<!\\)"/'$1'/g;  # "
	
	# 清理空构造函数
	$allTsContents =~ s/constructor\(\)\s*\{\s+\}//g;
	$allTsContents =~ s/constructor\(\)\s*\{\s+super\(\);\s+\}//g;
	
	# 清理可能的this.this.错误
	$allTsContents =~ s/(?<=this\.)this\.//g;
	
	# 清理空注释
	$allTsContents =~ s/\/\*\*\s+\*\s+\*\///g;
	
	# 清理多余的换行
	$allTsContents =~ s/[\r|\n]+import /\nimport /g;
	$allTsContents =~ s/^\s*(?=\S)(.*)/$1/g;
	$allTsContents =~ s/\n{3,}/\n\n/g;
	
	# 打开输出文件
	my $outFile = $file;
	$outFile =~ s/^\Q$_srcPath\E/$_outPath/;
	$outFile =~ s/(?<=\.)as$/ts/;
	my($outFileName, $outFilePath, $outFileSuffix)=fileparse($outFile);
	(-e $outFilePath) or mkpath($outFilePath);
	open ( OUTFILE, '>', $outFile ) or die ("ERROR: [scanFile] Can't open $outFile - $!\n");
	binmode OUTFILE, ':utf8';
	print OUTFILE $allTsContents;
	close OUTFILE;	
	
	#print "ts content = $allTsContents\n";
}

sub processFuncParams
{
	my ($inParamStr, $funcParamNameArr, $line) = @_;
	# 转换参数列表
	my $funcParamStr = '';
	if($inParamStr =~ /^\s*,/) {
		$funcParamStr.=', ';
	}
	my @funcParamsArr = split(/\s?,\s?/, $inParamStr);
	foreach my $funcParamUnit (@funcParamsArr) {
		if('' ne $funcParamStr) {
			$funcParamStr.=', ';
		}
		my @paramUnitArr = split(/\s?[\:=]\s?/, $funcParamUnit);
		my $paramUnitLen = scalar(@paramUnitArr);
		$funcParamStr.=$paramUnitArr[0];
		push @$funcParamNameArr, $paramUnitArr[0];
		if($paramUnitLen > 1) {
			# 有类型
			$funcParamStr.=': '.asType2tsType($paramUnitArr[1]);
			if($paramUnitLen > 2) {
				# 有默认参数
				$funcParamStr.=' = '.$paramUnitArr[2];
			}
		}          
	}
	if($inParamStr =~ /,\s*$/) {
		$funcParamStr.=', ';
	}
	$line.=$funcParamStr;
	return $line;
}

##
# as初始化转换为ts初始化
##
sub asInit2tsInit
{
	my $asInit = shift;
	my $tsInit = $asInit;
	($tsInit =~ s/new <\S+>//) or 
	($tsInit =~ s/new Vector\.<([\w|\.]+)>;/new Array<$1>();/) or 
	($tsInit =~ s/new Vector\./new Array/) or 
	($tsInit =~ s/new Dictionary\((true|false)?\)/{}/) or 
	($tsInit =~ s/new Object\(\)/{}/);
	if($tsInit =~ /(.*)new (\S+)\(\)(.*)/) {
		if($2 eq 'Array') {
			$tsInit = $1.'[]';
		} else {
			$tsInit = $1.'new '.asType2tsType($2).'()'.$3;
		}
	}
	# 去掉as xxx
	$tsInit =~ s/ as [\w|\.|<|>]+//g;
	return $tsInit;
}

##
# as类型转换为ts类型
##
sub asType2tsType
{
	my $asType = shift;
	# 检查是否矢量
	if($asType =~ /Vector\.<(\S+)>/) {
		return asType2tsType($1).'[]';
	} elsif($asType =~ /Array<(\S+)>/) {
		return 'Array<'.asType2tsType($1).'>';
	}

	my $tsType = $asType;
	if('Array' eq $asType) {
		$tsType = 'any[]';
	} elsif('int' eq $asType || 'uint' eq $asType || 'Number' eq $asType || 'longlong' eq $asType) {
		$tsType = 'number';
	} elsif('Boolean' eq $asType) {
		$tsType = 'boolean';
	} elsif('String' eq $asType) {
		$tsType = 'string';
	} elsif('Object' eq $asType || '*' eq $asType || 'Dictionary' eq $asType) {
		$tsType = 'any';
	} elsif($tsType =~ /(?:_Request|_Response|_Notify)$/) {
		$tsType = 'Protocol.'.$tsType;
	}else {
		$tsType =~ s/^(?:int|uint|Number|longlong) /number / or $tsType =~ s/^Boolean /boolean / or $tsType =~ s/^String /string / or $tsType =~ s/^(?:Object|\*|Dictionary) /any / 
	}
	return $tsType;
}

##
# 是否不需要import
##
sub noImport
{
	my $import = shift;
	return $import =~ /^automatic\.protocol\.(?!(Macros|Errorid))/ || $import =~ /^automatic\.cfgs\./ || $import =~ /MsgPool$/;
}

##
# 计算字串出现次数
##
sub countStr
{
	my $inputStr = shift;
	my $searchStr = shift;
	my $count = 0;
	while($inputStr =~ /\Q$searchStr\E/g) {
		$count++;
	}
	return $count;
}

sub trim
{
	my $inputStr = shift;
	$inputStr =~ s/^ +//;
	$inputStr =~ s/ +$//;
	return $inputStr;
}