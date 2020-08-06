##
#
# 将ActionScript代码转换为TypeScript代码。
# 使用时，需提供如下参数：
# 1. 源代码路径
# 2. 生成的ts代码保存路径
#
# author teppei
# date 2016/9/30
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
scanRecuisively($_srcPath.'/project/FyGame/src');
scanRecuisively($_srcPath.'/src');

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
				next if(checkSkipDir($curPath));
				
				scanRecuisively($curPath);
			}
			elsif(!checkSkipFile($curPath))
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
  return ($input =~ /net\/FyProtocol/ || 
		$input =~ /net\/newprotocol/ || 
		$input =~ /data\/xmlData/ || 
		$input =~ /com\/adobe/ || 
		$input =~ /com\/greensock/ || 
		$input =~ /com\/hexagonstar/ || 
		$input =~ /com\/tstudio/ || 
		$input =~ /fygame\/templates/);
}

##
# 检查是否跳过file
##
sub checkSkipFile
{
  my $input=shift;
  return ($input !~ /\.as/ || 
		$input =~ /assert\.as$/ || 
		$input =~ /StrConst\.as$/ || 
		$input =~ /AppStrConst\.as$/ || 
		$input =~ /CrStrConst\.as$/);
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
	my %classScopeMap = ();  # 可能一个文件里声明了多个类，记录[类名 - (起始行，终止行)]
	my $className;
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
	
	my @protocolStructs = ();  # 记录协议结构
	my @configStructs = ();  # 记录表格结构
	
	my $packageBraceFlag = 0;  # 标记package的花括号状态
	my $pflag = 0;
	
	# 下面开始代码替换
	for($i = 0; $i < $totalLineNum; $i++) {
	  # 跳过package，这里不考虑内部类的情况
	  #next ;
	  $line = $contents[$i];
	  
	  if($line =~ /^\/\// || $line =~/^\s*\/\*\*/ || $line =~ /^\s*\*/) {
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
	  } elsif($line =~ /\s*import (\S+);/) {
	    # 转换import
	    $inFunc = 0;
	    
	    $var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改
	    
	    # 先把用到的协议结构记录下来
	    if($var_1 =~ /FyProtocol\.(\S+)$/ && 'Macros' ne $1 && 'TinyMacros' ne $1 && 'FyMSg' ne $1 && '*' ne $1) {
	      push @protocolStructs, $1;
	    }
	    # 把用到表格结构也记录下来
	    if($var_1 =~ /xmlData\.(\S+)$/) {
	      my $var_s1 = $1;
	      if('*' ne $var_s1) {
	        $var_s1 =~ s/_Flash$/M/;
	        push @configStructs, $var_s1;
	      }	      
	    }
	    
	    if(noImport($var_1)) {
	      $line = "\n";
	    } else {
	      $var_1 =~ s/fygame\.modules/System/;
	      $var_1 =~ s/fygame\.rules\.Rule/System.constants.Constants/;
	      $var_1 =~ s/system\.element/unit/;
	      $var_1 =~ s/fygame(?=\.utils)/System/;
	      $var_1 =~ s/fygame\.modules\.data\.enum(?=\.ErrorId)/System.protocol/;
	      $var_1 =~ s/fygame\.modules\.data\.getLang/System.data.LangData/;
	      $var_1 =~ s/fygame\.modules\.bag\.data(?=\.ThingItemData)/System.data.thing/;
	      $var_1 =~ s/fygame\.utils\.FyConst/System.constants.Constants/;
	      $var_1 =~ s/fygame\.modules\.element\.npc\.NPCDialog/System.quest.taskView/;
	      my @importArr = split(/\./, $var_1);
        # Dictionary等不需要import
        $line = 'import {'.$importArr[scalar(@importArr) - 1].'} from \''.join('/', @importArr)."\'\n";
	    }            
    } elsif($line =~ s/(?:public )?(?:final )?class (\w+)/export class $1/) {
      # 转换class声明
      $inFunc = 0;
      
      $var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改
      
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
      $className = $var_1;
      my @classScopeArr = ($i, $i);
      $classScopeMap{$className} = [@classScopeArr];
      
    } elsif($line =~ /\s*(public|protected|private)( static)? (const|var) (\S+)\s?:\s?([^\s=;]+)(.*)/g) {
      # 转换成员变量声明
      $inFunc = 0;
      
      $var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改
      $var_2 = $2;
      $var_3 = $3;
      $var_4 = $4;
      $var_5 = $5;
      $var_6 = $6;
      
      $line = 'public' eq $var_1 ? '' : $var_1;
      $propertyKey = $className.'+'.$var_4;
      if(defined $var_2 && ' static' eq $var_2){
        $line.=' static';
        $propertiesMap{$propertyKey} = 2;
      } else {
        $propertiesMap{$propertyKey} = 1;
      }
      my $memberTsType = asType2tsType($var_5);
      $line.=' '.$var_4.': '.$memberTsType;
      # 翻译初始化
      if($var_6 =~ /\s*=\s*([^;]*)/) {
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
    } elsif($line =~ /\s*(public|protected|private)( static)? function ([^\(]+)\(([^\)]*)\)(?:\s?:\s?([^\s\{]+))?(.*)/) {
      # 转换成员函数
      $inFunc = 1;
      
      $var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改
      $var_2 = $2;
      $var_3 = $3;
      $var_4 = $4;
      $var_5 = $5;
      $var_6 = $6;
      
      # 检查是否getter/setter
      my @funcParamNameArr = ();
      my $getterSetter = 0;  # 1是getter，2是setter
      if(defined $className && $className eq $var_3) {
        # 这是构造函数，名字改成constructor
        $funcName = 'constructor';
      } elsif($var_3 =~ /(get|set) (.*)/) {
        # getter/setter
        $getterSetter = 'get' eq $1 ? 1 : 2;
        $funcName = $2;
      } else {
        $funcName = $var_3;
      }
      
      # 标记进入函数体
      if(!(defined $inFuncName) || $inFuncName ne $funcName) {
        if(defined $inFuncName) {
          # 标记函数体结束行
          my $lastFuncScopeArr = $funcScopeMap{$inFuncName};
          @$lastFuncScopeArr[1] = $i - 1;
        }
        $inFuncName = $funcName;
        # 标记函数体起始行
        my @funcScopeArr = ($i, $i);
        $funcScopeMap{$funcName} = [@funcScopeArr];
      }
      $funcKey = (defined $className ? $className : '').'+'.$funcName;
      
      if('constructor' ne $funcName) {
        $line = 'public' eq $var_1 ? '' : $var_1;
        if(defined $var_2 && ' static' eq $var_2){
          $line.=' static';
          $staticFuncMap{$funcKey} = 1;  # 标记为静态函数
        }
        $line.=' '.$var_3.'(';
      } else {
        $line = 'constructor(';
      }
      
      if('' ne $var_4) {
        # 转换参数列表
        my $funcParamStr = '';
        my @funcParamsArr = split(/\s?,\s?/, $var_4);
        foreach my $funcParamUnit (@funcParamsArr) {
          if('' ne $funcParamStr) {
            $funcParamStr.=', ';
          }
          my @paramUnitArr = split(/\s?[\:=]\s?/, $funcParamUnit);
          my $paramUnitLen = scalar(@paramUnitArr);
          $funcParamStr.=$paramUnitArr[0];
          push @funcParamNameArr, $paramUnitArr[0];
          if($paramUnitLen > 1) {
            # 有类型
            $funcParamStr.=': '.asType2tsType($paramUnitArr[1]);
            if($paramUnitLen > 2) {
              # 有默认参数
              $funcParamStr.=' = '.$paramUnitArr[2];
            }
          }          
        }
        $line.=$funcParamStr;
      }
      $line.=')';
      if(2 != $getterSetter && defined $var_5 && '' ne $var_5) {
        $line.=': '.asType2tsType($var_5);
      }      
      $line.=$var_6."\n";
      
      $funcMap{$funcKey} = [@funcParamNameArr]; # 保存成员函数信息
    } elsif($line =~ /(.*)(?<=[\s\(;])var ([^;]+)(.*)/) {
      # 转换局部变量
      $var_1 = $1; # 先保存匹配变量，防止下面执行正则时被改
      $var_2 = $2;
      $var_3 = $3;   
      
      my $varStr = '';
      # 考虑一行声明多个变量的情形，如果以,分割变量实际上有bug，比如var a: int = Math.max(1, 0), b: int = 2; 
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
        $varUnit =~ /(\S+)\s?:\s?([^\s=]+)(.*)/;
        $var_s1 = $1;
        $var_s2 = $2;
        $var_s3 = $3;
        
        $varStr.=$var_s1;
        if('' ne $var_s2) {
          # 有类型
          my $tmpTsType = asType2tsType($var_s2);
          $varStr.=': '.$tmpTsType;
          if('' ne $var_s3 && $var_s3 =~ /^\s*=/) {
            # 有初始化
            $var_s3 =~ s/^\s*=\s*//;
            $varStr.=' = '.asInit2tsInit($var_s3);
          } else {
            # number类型自动初始化为0
            if('number' ne $var_s2 && 'number' eq $tmpTsType) {
              $varStr.=' = 0';
            } elsif('boolean' ne $var_s2 && 'boolean' eq $tmpTsType) {
              $varStr.=' = false';
            }
            $varStr.=$var_s3;
          }
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
	  if($funcEnd == $funcStart) {
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
    	  $funcLine =~ s/(?<![\.\w\d_])\Q$property\E(?!\w\d_)/$thisStr.$property/g;  # 除了 . 字母 数字 _ 开头的需要加上this，且后面不带 字母 数字 _
    	  $tsContents[$i] = $funcLine;
    	}
  	}
  	
  	# 再处理成员函数
  	foreach my $otherFuncKey (keys %funcMap) {  
  	  next if($otherFuncKey eq $funcKey);
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
	
	my $needG = 0;
	my $needEventDispatcher = 0;
	my $needConfirmCheck = 0;
	my $needMessageBoxConst = 0;
	my $needProtocolUtil = 0;
	my $needUint = 0;
	my $needInt = 0;
	my $needBaseScfCtrl = 0;
	
	# for each 换成 for of
	$allTsContents =~ s/for each\s?\(\s?(?:var|let) ([^:\s]+)(\s?:\s?[\S]+)? in /for (let $1 of /g;
	$allTsContents =~ s/for each\s?\(\s?([^:\s]+)(\s?:\s?[\S]+)? in /for ($1 of /g;
	
	# for in去掉类型声明
	$allTsContents =~ s/for\s?\(\s?let ([^:\s]+)\s?:\s?[\S+] in/for (let $1 in/g;
	
	# 事件监听 换成 this.addEvent
	$allTsContents =~ s/\s*m_events\s?=\s?\{\};//g;
	$allTsContents =~ s/\s*startEvents\(\);//g;
	$allTsContents =~ s/(?<=\saddEvent\()EventTypes\.([^,]+),\s?([^\s]+)/Events.$1, this.$2/g;
	$allTsContents =~ s/m_events\[EventTypes\.([^\]]+)\]\s?=\s?([^;]+)/this.addEvent(Events.$1, this.$2)/g;
	
	# CONFIG::debug 换成 if(defines.has('_DEBUG'))
	$allTsContents =~ s/CONFIG::debug/if(defines.has('_DEBUG'))/g;
	
	# assert 换成 uts.assert
	$allTsContents =~ s/assert\(/uts.assert(/g;
	
	# gTipMgr.addMainFloatTip/addRoleCurrencyMsg 换成 G.TipMgr.addMainFloatTip/addRoleCurrencyMsg...
	if($allTsContents =~ s/(\S+)(?=\.(?:addMainFloatTip|addRoleCurrencyMsg|addMouseCursorMsg|addPosTextMsg|addSafetyWarning))/G.TipMgr/g) {
	  $needG = 1;
	}
	
	# MessageBoxConst.YES 转换为 MessageBoxConst.yes
	if($allTsContents =~ s/(?<=MessageBoxConst\.)(\w+)/\L$1/g) {
	  $needMessageBoxConst = 1;
	}
	
	# ConfirmDialogUtil.showConfirm 换成 G.TipMgr.showConfirm
	if($allTsContents =~ s/ConfirmDialogUtil(?=\.showConfirm)/G.TipMgr/g) {
	  $needG = 1;
	}
	
	# ConfirmDialogUtil.close 换成 G.TipMgr.closeConfirm
	if($allTsContents =~ s/ConfirmDialogUtil\.close/G.TipMgr.closeConfirm/g) {
	  $needG = 1;
	}
	
	# ConfirmDialogUtil.isShowing 换成 G.TipMgr.isConfirmShowing
	if($allTsContents =~ s/ConfirmDialogUtil\.isShowing/G.TipMgr.isConfirmShowing/g) {
	  $needG = 1;
	}
	
	# ConfirmDialog.NO_CHECK 换成 ConfirmCheck.noCheck
	if($allTsContents =~ s/ConfirmDialog\.NO_CHECK/ConfirmCheck.noCheck/g) {
	  $needConfirmCheck = 1;
	}
	if($allTsContents =~ s/ConfirmDialog\.WITH_CHECK/ConfirmCheck.withCheck/g) {
	  $needConfirmCheck = 1;
	}
	
	# EnumUICmd.OPEN 换成 DialogCmd.open
	if($allTsContents =~ s/EnumUICmd\.(\w+)/DialogCmd.\L$1/g) {
	  $needConfirmCheck = 1;
	}
	
	# 协议发送
	$allTsContents =~ s/m_netModule(?=\.sendMsg)/G.ModuleMgr.netModule/g;
	if($allTsContents =~ s/Protocol(?=\.get)/ProtocolUtil/g) {
	  $needProtocolUtil = 1;
	}
	
	# 转换协议结构
	foreach my $pstruct (@protocolStructs) {
	  $allTsContents =~ s/(?<![\.\w])\Q$pstruct\E(?![\w_])/Protocol.$pstruct/g;
	}
	
	# 协议监听 换成 addNetListener
	if($allTsContents =~ s/m_events\[MsgType\.([^\]]+)\]\s?=\s?([^;]+)/this.addNetListener(Macros.MsgID_$1, this.$2)/g) {
	  $needEventDispatcher = 1;
	}
	
	# FyMsg一般是在协议响应函数里，因为ts里面使用body作为参数了，不好脚本转换，改成XXX方便手工转换
	$allTsContents =~ s/msg\s?:\s?FyMsg(?=\))/body: Protocol.XXX/g;
	# FyMsg改成Protocol.FyMsg
	$allTsContents =~ s/(?<![\.\w])FyMsg/Protocol.FyMsg/g;
	
	# 转换表格结构
	foreach my $cfgStruct (@configStructs) {
	  $allTsContents =~ s/(?<![\w_\.])\Q$cfgStruct\E(?![\w_])/GameConfig.$cfgStruct/g;
	}
	
	# 事件派发
	if($allTsContents =~ s/dispatchEvent\(new ArgsEvent\(EventTypes\.([^)]+)\)\)/this.dispatchEvent(Events.$1)/g) {
	  $needEventDispatcher = 1;
	}
	if($allTsContents =~ s/sendEvent(?:Panel)?\(EventTypes\.([^)]+)\)/this.dispatchEvent(Events.$1)/g) {
	  $needEventDispatcher = 1;
	}
	$allTsContents =~ s/\S+(?=this\.dispatchEvent)//g;
	
	# showTips
  if($allTsContents =~ s/(?<=\s)showTips(?=\()/G.TipMgr.addMainFloatTip/g) {
    $needG = 1;
  }
	
	# KeyWord.getInfomationById(KeyWord.GROUP_EQUIP_PROP, id).cname
	$allTsContents =~ s/(?<=KeyWord\.)getInfomationById\(([^,]+),\s?([^\)]+)\)\.cname/getDesc($1, $2)/g;
	
	# 清理一批import
	$allTsContents =~ s/System\/base\/events\/EventTypes/System\/Events/g;
	$allTsContents =~ s/\{EnumUICmd\} from 'System\/data\/enum\/EnumUICmd'/{DialogCmd} from 'System\/uilib\/UIManager'/g;
	$allTsContents =~ s/\{(Enum\w+)\} from 'System\/data\/enum\/\w+'/{$1} from 'System\/constants\/GameEnum'/g;
	$allTsContents =~ s/\{EnumPosState\} from 'System\/element\/utils\/\w+'/{PositionState} from 'System\/constants\/GameEnum'/g;
	$allTsContents =~ s/(?<=utils\/)Color/ColorUtil/g;
	$allTsContents =~ s/System\/net\/FyProtocol\/Macros/System\/protocol\/Macros/g;
	$allTsContents =~ s/System\/utils\/keyword\/KeyWord/System\/constants\/KeyWord/g;
	$allTsContents =~ s/(?<=\{)EventTypes(?=\})/Events/g;
	$allTsContents =~ s/fygame\/core\/runtime\/\w+/System\/data\/Runtime/g;
	$allTsContents =~ s/(?<=System\/data\/)HeroData/RoleData/g;
	$allTsContents =~ s/(?<=System\/data\/)ThingDataManager/thing\/ThingDataManager/g;
	
	# 系统参数
	if($allTsContents =~ s/DataModule\.ins\.getValueByParameterId/G.DataMgr.constData.getValueById/g) {
	  # 需要用到G
	  $needG = 1;
	}
	
	# 获取错误码
	if($allTsContents =~ s/DataModule\.ins\.getErrDescription/G.DataMgr.errorData.getErrorStringById/g) {
	  # 需要用到G
	  $needG = 1;
	}
	
	# DataModule.ins.isAffordable换成G.ActionHandler.isAffordable
	if($allTsContents =~ s/DataModule\.ins(?=\.isAffordable)/G.ActionHandler/g) {
	  $needG = 1;
	}
	
	# DataModule.ins 换成 G.DataMgr	
	if($allTsContents =~ s/DataModule\.ins/G.DataMgr/g) {
	  # 需要用到G
	  $needG = 1;
	}
	
	# G.DataMgr.thingDataManager 换成 G.DataMgr.thingData
	$allTsContents =~ s/(?<=G\.DataMgr\.)thingDataManager/thingData/g;
	
	# G.DataMgr.skillMainData 换成 G.DataMgr.skillData
	$allTsContents =~ s/(?<=G\.DataMgr\.)skillMainData/skillData/g;
	
	# heroData.getPropertyByID 改为 getProperty
	$allTsContents =~ s/(?<=heroData\.)getPropertyByID/getProperty/g;
	
	# ActionHandler.XXX 改为 G.ActionHandler.XXX
	$allTsContents =~ s/(?<!G\.)ActionHandler(?=\.)/G.ActionHandler/g;
	
	# Mgr.ins.syncTime 换成 G.SyncTime
	if($allTsContents =~ s/Mgr\.ins\.syncTime/G.SyncTime/g) {
	  # 需要用到G
	  $needG = 1;
	}
	
	# Mgr.ins.runtime 换成 G.DataMgr.runtime
	if($allTsContents =~ s/Mgr\.ins\.runtime/G.DataMgr.runtime/g) {
	  # 需要用到G
	  $needG = 1;
	}
	if($allTsContents =~ s/(?:this\.)?m_manager\.runtime/G.DataMgr.runtime/g) {
	  # 需要用到G
	  $needG = 1;
	}
	
	# Mgr.ins.gameParas 换成 G.DataMgr.gameParas
	if($allTsContents =~ s/Mgr\.ins\.gameParas/G.DataMgr.gameParas/g) {
	  # 需要用到G
	  $needG = 1;
	}
	
	# GuideMgr.ins 换成 G.GuideMgr
	if($allTsContents =~ s/GuideMgr\.ins/G.GuideMgr/g) {
	  # 需要用到G
	  $needG = 1;
	}
	
	# 剩下的Mgr.ins统一换成G
	if($allTsContents =~ s/(?<=\s)Mgr\.ins/G/g) {
	  $needG = 1;
	}
	
	# Rule.XXX 换成 Constants
	$allTsContents =~ s/(?<!\w)Rule(?=\.)/Constants/g;
	
	# sort方法里加上this
	$allTsContents =~ s/(?<=\.sort\()(\S+)(?=\);)/this.$1/g;
	
	# getLang/getLangTip 改成用 LangData
	if($allTsContents =~ s/getLang(?:Tip)?\(Lang\.L(\d+)/G.DataMgr.langData.getLang($1/g) {
	  # 需要用到G
	  $needG = 1;
	}
	
	# DOUtil.checkPosIsReach换成MathUtil
	$allTsContents =~ s/DOUtil(?=\.checkPosIsReach)/MathUtil/g;
	
	# getTimer() 改成 UnityEngine.Time.realtimeSinceStartup
	$allTsContents =~ s/getTimer\(\)/Math.round(UnityEngine.Time.realtimeSinceStartup * 1000)/g;	
	
	if($allTsContents =~ /uint\.MAX_VALUE/) {
	  $needUint = 1;
	}
	if($allTsContents =~ /(?<!u)int\.MAX_VALUE/) {
	  $needInt = 1;
	}
	
	# 部分事件改接口
	$allTsContents =~ s/\S*\.dispatchEvent\(Events\.TryEnterPinstance, /G.ModuleMgr.pinstanceModule.tryEnterPinstance(/g;
	
	# 专门针对ScfCtrl进行处理
	if($allTsContents =~ /extends BaseScfCtrl/g) {
	  $needBaseScfCtrl = 1;
	  $allTsContents =~ s/(?<!\w)doFunction(?!\w)/handleClick/g;
	  $allTsContents =~ s/(?<=\.)actName\s?=\s?([^;]+)/setDisplayName($1)/g;
	}
	
	# import 需要的	
	if(1 == $needBaseScfCtrl) {
	  $allTsContents = "import {BaseScfCtrl} from \'System/main/actBtns/BaseScfCtrl\'\n".$allTsContents;
	}		
	if(1 == $needUint) {
	  $allTsContents = "import {uint} from \'System/utils/MathUtil\'\n".$allTsContents;
	}		
	if(1 == $needInt) {
	  $allTsContents = "import {int} from \'System/utils/MathUtil\'\n".$allTsContents;
	}	
	if(1 == $needConfirmCheck && $allTsContents !~ /import \{ConfirmCheck\}/) {
	  $allTsContents = "import {ConfirmCheck} from \'System/tip/TipManager\'\n".$allTsContents;
	}
	if(1 == $needMessageBoxConst && $allTsContents !~ /import \{MessageBoxConst\}/) {
	  $allTsContents = "import {MessageBoxConst} from \'System/tip/TipManager\'\n".$allTsContents;
	}
	if(1 == $needProtocolUtil && $allTsContents !~ /import \{EventDispatcher\}/) {
	  $allTsContents = "import {ProtocolUtil} from \'System/protocol/ProtocolUtil\'\n".$allTsContents;
	}
	if(1 == $needEventDispatcher && $allTsContents !~ /import \{EventDispatcher\}/) {
	  $allTsContents = "import {EventDispatcher} from \'System/EventDispatcher\'\n".$allTsContents;
	}
	if(1 == $needG && $allTsContents !~ /import \{Global as G\}/) {
	  $allTsContents = "import {Global as G} from \'System/global\'\n".$allTsContents;
	}	
	
	# clone转换
	$allTsContents =~ s/(\S+)\s?=\s?(\S+)\.clone\((\S+)\);/$1 = uts.deepcopy($2, $3, true);/g;
	
	# Log.trace
	$allTsContents =~ s/Log\.trace/uts.log/g;
	
	# StringUtil.substitute 改 uts.format
	$allTsContents =~ s/StringUtil\.substitute/uts.format/g;
	$allTsContents =~ s/substitute/uts.format/g;
	
	# TinyMacros 改 Macros
	$allTsContents =~ s/TinyMacros/Macros/g;
	
	# TinyKeyWord 改 KeyWord
	$allTsContents =~ s/TinyKeyWord/KeyWord/g;
	
	# FyConst改Constants
	$allTsContents =~ s/FyConst/Constants/g;
	
	# NPCDialog.instance 改 G.form<TaskView>(TaskView)
	$allTsContents =~ s/NPCDialog\.instance/G.form<TaskView>(TaskView)/g;
	
	# DataModule.ins.loginResponse.m_uiServerStartTime 改 G.SyncTime.m_uiServerStartTime
	$allTsContents =~ s/G\.DataMgr\.loginResponse(?=\.m_uiServerStartTime)/G.SyncTime/g;
	
	# 针对ProtocolUtil
	$allTsContents =~ s/Protocol\.m_roleID/G.DataMgr.gameParas.roleID/g;
	$allTsContents =~ s/NewFyMsgProcess\.instance\.getEncodeMsg\(Macros\.MsgID_([^)]+)\)/SendMsgUtil.get$1()/g;
	$allTsContents =~ s/(?<=msg\.m_msgBody as) (?!Protocol\.)/ Protocol./g;
	
	# pathSearcher 改 MapMgr
	$allTsContents =~ s/(\S+)\.pathSearcher(?=\.)/G.Mapmgr/g;
	
	# roleData 换 Data
	$allTsContents =~ s/(?<=\.)roleData/Data/g;
	
	# PetDataMgr 改 PetData
	$allTsContents =~ s/PetDataMgr/PetData/g;
	
	# Number 改 number
	$allTsContents =~ s/(?<!\w)Number(?!\w)/number/g;
	# String 改 string
	$allTsContents =~ s/(?<!\w)String(?!\w)/string/g;
	# Boolean 改 boolean
	$allTsContents =~ s/(?<!\w)String(?!\w)/string/g;
	
	# 针对枚举
	if($file =~ /Enum\w+\.as$/) {
	  $allTsContents =~ s/static ([\w\d_]+): number = (\d+);/$1 = $2, /g;
	}
	
	# 将注释转换为单行
	$allTsContents =~ s/\/\*\*\s+\*\s?(\S+)\s+\*\//\/**$1*\//g;
	
	# 字符串替换成单引号
	$allTsContents =~ s/(?<!\\)"([^"]*)(?<!\\)"/'$1'/g;  # "
	
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
	# fygame/modules替换为System
	$outFile =~ s/fygame\/modules/System/;
	$outFile =~ s/(?<=\.)as$/ts/;
	my($outFileName, $outFilePath, $outFileSuffix)=fileparse($outFile);
	(-e $outFilePath) or mkpath($outFilePath);
	open ( OUTFILE, '>', $outFile ) or die ("ERROR: [scanFile] Can't open $outFile - $!\n");
	binmode OUTFILE, ':utf8';
  print OUTFILE $allTsContents;
	close OUTFILE;	
	
	#print "ts content = $allTsContents\n";
}

##
# as初始化转换为ts初始化
##
sub asInit2tsInit
{
  my $asInit = shift;
  my $tsInit = $asInit;
  ($tsInit =~ s/new <\S+>//) or ($tsInit =~ s/new Vector\./new Array/) or ($tsInit =~ s/new Dictionary\((true|false)?\)/{}/);
  if($tsInit =~ /(.*)new (\S+)\(\)(.*)/) {
    $tsInit = $1.'new '.asType2tsType($2).'()'.$3;
  }
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
    $tsType = '[]';
  } elsif('int' eq $asType || 'uint' eq $asType || 'Number' eq $asType || 'longlong' eq $asType) {
    $tsType = 'number';
  } elsif('Boolean' eq $asType) {
    $tsType = 'boolean';
  } elsif('String' eq $asType) {
    $tsType = 'string';
  } elsif('Object' eq $asType || '*' eq $asType || 'Dictionary' eq $asType) {
    $tsType = '{ [key: KeyType]: ValueType }';
  } elsif('FyPoint' eq $asType) {
    $tsType = 'UnityEngine.Vector2';
  } elsif('BaseRole' eq $asType) {
    $tsType = 'UnitController';
  } elsif('Role' eq $asType) {
    $tsType = 'UnitController';
  } elsif('Hero' eq $asType) {
    $tsType = 'HeroController';
  } elsif('Monster' eq $asType) {
    $tsType = 'MonsterController';
  } elsif('NPC' eq $asType) {
    $tsType = 'NpcController';
  } elsif($tsType =~ /(?:_Request|_Response|_Notify)$/) {
    $tsType = 'Protocol.'.$tsType;
  }else {
    # XX_Flash转化为XXM
    $tsType =~ s/^(?:int|uint|Number|longlong) /number / or $tsType =~ s/^Boolean /boolean / or $tsType =~ s/^String /string / or $tsType =~ s/^(?:Object|\*|Dictionary) /any / or $tsType =~ s/_Flash$/M/;  
  }
  return $tsType;
}

##
# 是否不需要import
##
sub noImport
{
  my $import = shift;
  return $import =~ /fygame\.assert/ || $import =~ /fygame\.utils\.Log/ || $import =~ /fygame\.managers\.Mgr/g || 
  $import =~ /fygame\.modules\.base\.events\.ArgsEvent/ || 
  $import =~ /DataModule$/ || $import =~ /StringUtil$/ || 
  $import =~ /ConfirmDialogUtil$/ || $import =~ /ConfirmDialog$/ || $import =~ /MessageBoxConst$/ || 
  $import =~ /^flash\./ || $import =~ /^fy\./ || $import =~ /^fygame\.modules\.data\.xmlData\./ || 
  $import =~ /^fygame\.modules\.net\.FyProtocol\.(?!Macros)/;
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