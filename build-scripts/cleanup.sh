#!/bin/bash

set -e

cd `dirname $0`
. env.sh
cd ..

rm -rf $TESTSPACE