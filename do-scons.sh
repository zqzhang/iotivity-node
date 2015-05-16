#!/bin/sh

PRODUCT_DIR="$1"

if test "x${PRODUCT_DIR}x" = "xx"; then
	echo "Usage: "`filename $0`" <PROUCT_DIR>"
	exit 1
fi

# scons is brain-damaged in that it doesn't work with -C, even though it claims to support it.
# So, like,
#
# scons -C bower_components/iotivity
#
# will not work, but
#
# cd bower_components/iotiovity; scons
#
# will work just fine.
cd bower_components/iotivity
scons liboctbstack
cd ../..

# Copy relevant files over to the main build directory.
(
	find bower_components/iotivity/out -name liboctbstack.a -print -quit
	find bower_components/iotivity/out -name libconnectivity_abstraction.a -print -quit
	find bower_components/iotivity/out -name libcoap.a -print -quit
) | while read; do cp "${REPLY}" "${PRODUCT_DIR}"; done
