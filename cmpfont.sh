#! /usr/bin/env bash

mkdir .tmp
cd static/font
mv `ls | grep -E -v "^(chfont)$"` ../../.tmp

cd ../../

font-spider static/*.html

mv .tmp/* static/font/
rm -r .tmp
