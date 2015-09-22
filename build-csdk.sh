#!/bin/bash

CSDK_REVISION="1.0.0-RC1a"

if test "x$1x" = "x--debugx"; then
	SCONS_FLAGS="RELEASE=False"
fi

set -x

mkdir -p ./depbuild || exit 1

# Download and build iotivity from tarball
cd ./depbuild || exit 1
	wget -qO iotivity.tar.gz 'https://gerrit.iotivity.org/gerrit/gitweb?p=iotivity.git;a=snapshot;h='"${CSDK_REVISION}"';sf=tgz' || exit 1
	tar xzf iotivity.tar.gz || exit 1
	rm -f iotivity.tar.gz || exit 1

	# There should only be one directory inside this directory, so using the wildcard evaluates
	# exactly to it
	cd iotivity* || exit 1

		# iotivity wants us to clone this before it'll do anything
		git clone https://github.com/01org/tinycbor.git extlibs/tinycbor/tinycbor || exit 1
		git clone https://github.com/jbeder/yaml-cpp.git extlibs/yaml/yaml || exit 1
		JAVA_HOME=/ scons $SCONS_FLAGS liboctbstack libconnectivity_abstraction libcoap c_common libocsrm || { cat config.log; exit 1; }
		PREFIX="$(pwd)/../../deps/iotivity" NO_PC="true" "$(pwd)/../../install.sh" || exit 1

cd ../../ || exit 1

if test "x$1x" != "x--debugx"; then
	rm -rf depbuild || exit 1
fi
