{
	"target_defaults": {
		"actions": [
			{
				"action_name": "csdk_scons",
				"inputs": [ "bower_components/iotivity/resource/csdk" ],
				"outputs": [ "bower_components/iotivity/out" ],
				"action": [ "sh", "do-scons.sh", "<(PRODUCT_DIR)" ]
			}
		],
		"include_dirs": [
			"<!(node -e \"require('nan')\")",
			"bower_components/iotivity/resource/csdk/stack/include",
			"bower_components/iotivity/resource/csdk/ocsocket/include"
		],
		"libraries": [
			"<(PRODUCT_DIR)/liboctbstack.a",
			"<(PRODUCT_DIR)/libconnectivity_abstraction.a",
			"<(PRODUCT_DIR)/libcoap.a"
		],
	},
	"targets": [
		{
			"target_name": "iotivity",
			"sources": [
				"src/main.cc",
				"src/common.cc",
				"src/enums.cc",
				"src/structures.cc",
				"src/functions/oc-create-delete-resource.cc",
				"src/functions/oc-do-resource.cc",
				"src/functions/oc-do-response.cc",
				"src/functions/simple.cc",
				"src/functions.cc",
				"src/callback-info.c"
			],
			"libraries": [ "<(PRODUCT_DIR)/libffi.a" ],
			"conditions": [
				[ "'<!(echo $TESTING)'=='true'",
						{ "defines": [ "TESTING" ] } ]
			],
			"dependencies": [
				"node_modules/ffi/deps/libffi/libffi.gyp:ffi"
			]
		},
		{
			"target_name": "client",
			"type": "executable",
			"sources": [ "c/client.c" ],
			"libraries": [ '<!(pkg-config --libs glib-2.0)' ],
			"cflags": [ '<!(pkg-config --cflags glib-2.0)' ]
		},
		{
			"target_name": "server",
			"type": "executable",
			"sources": [ "c/server.c" ],
			"libraries": [ '<!(pkg-config --libs glib-2.0)' ],
			"cflags": [ '<!(pkg-config --cflags glib-2.0)' ]
		},
		{
			"target_name": "server.observable",
			"type": "executable",
			"sources": [ "c/server.observable.c" ],
			"libraries": [ '<!(pkg-config --libs glib-2.0)' ],
			"cflags": [ '<!(pkg-config --cflags glib-2.0)' ]
		}
	]
}
