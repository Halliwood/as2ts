:: as批量转ts脚本
:: @teppei, 2016/9/30

@echo off
setlocal enabledelayedexpansion

title as批量转ts@teppei

type readme.txt

set launcher_srcPath="F:\mtj"
set lauucher_outPath="E:\FYMClient\branches\mtjts"

perl as2ts.pl %launcher_srcPath% %lauucher_outPath%

: END
endlocal enabledelayedexpansion
@pause