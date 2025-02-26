#!/bin/bash

set -euo pipefail

function test {
  local TEST_NR="$1"
  local TEST_DESCRIPTION=$2
  local TEST_STRING="$3"
  local TEST_OPTIONS="$4"
  echo "👉 Test $TEST_NR: $TEST_DESCRIPTION "
  node ./bin/cli.js step1 -y ../test/files/yarrrml$TEST_NR.yml -s ../test/files/status$TEST_NR.json $TEST_OPTIONS >  ../test/files/test$TEST_NR.log
  node ./bin/cli.js step2 -s ../test/files/status$TEST_NR.json -v >> ../test/files/test$TEST_NR.log
  if grep -q "$TEST_STRING" ../test/files/test$TEST_NR.log ; then
    echo passed.
  else 
    echo failed!
  fi
}

pushd ../main > /dev/null

test 1 'simple case'                            'verification summary: 6 passed, 0 failed, 0 invalid, 0 execution errors.' ''
test 2 'multiple index levels, depth 2'         'verification summary: 8 passed, 0 failed, 0 invalid, 0 execution errors.' '-d 2'
test 3 'multiple index levels, depth 0'         'verification summary: 8 passed, 0 failed, 0 invalid, 0 execution errors.' '-d 0'
test 4 'multiple index levels, depth default'   'verification summary: 4 passed, 0 failed, 0 invalid, 0 execution errors.' ''

popd > /dev/null
