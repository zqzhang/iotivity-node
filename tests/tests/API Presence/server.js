var theResource,
	requestCount = 0,
	utils = require( "../../assert-to-console" ),
	device = require( "../../../index" )(),
	uuid = process.argv[ 2 ];

console.log( JSON.stringify( { assertionCount: 5 } ) );

device.configure( {
	role: "server",
	info: {
		uuid: uuid,
		name: "api-discovery-" + uuid,
		manufacturerName: "Intel"
	}
} ).then(
	function() {
		utils.assert( "ok", true, "Server: device.configure() successful" );

		device.addEventListener( "request", function( request ) {
			requestCount++;

			if ( request.type === "update" && request.res.op === "cyclePresence" ) {
				setTimeout( function() {
					device.disablePresence().then(
						function() {
							utils.assert( "ok", true,
								"Server: device.disablePresence() successful" );
						},
						function( error ) {
							utils.assert( "ok", false,
								"Server: device.disablePresence() failed with: " + error );
						} );
					setTimeout( function() {
						device.enablePresence().then(
							function() {
								utils.assert( "ok", true,
									"Server: device.enablePresence() successful" );
							},
							function( error ) {
								utils.assert( "ok", false,
									"Server: device.enablePresence() failed with: " + error );
							} );
					}, 5000 );
				}, 5000 );
			}

			request.sendResponse( null );
		} );

		device.enablePresence().then(
			function() {
				device.registerResource( {
					id: { path: "/a/" + uuid },
					deviceId: uuid,
					resourceTypes: [ "core.light" ],
					interfaces: [ "oic.if.baseline" ],
					discoverable: true,
					properties: { someValue: 0 }
				} ).then(
					function( resource ) {
						theResource = resource;
						utils.assert( "ok", true, "Server: device.registerResource() successful" );

						// Signal to the test suite that we're ready for the client
						console.log( JSON.stringify( { ready: true } ) );
					},
					function( error ) {
						utils.assert( "ok", false,
							"Server: device.registerResource() failed with: " + error );
					} );
			}, function( error ) {
				utils.assert( "ok", false,
					"Server: device.enablePresence() failed with: " + error );
			} );
	},
	function( error ) {
		utils.assert( "ok", false, "Server: device.configure() failed with: " + error );
	} );

// Cleanup on SIGINT
process.on( "SIGINT", function() {
	device.unregisterResource( theResource ).then(
		function() {
			utils.assert( "ok", true, "Server: device.unregisterResource() successful" );
			process.exit( 0 );
		},
		function( error ) {
			utils.assert( "ok", false,
				"Server: device.unregisterResource() failed with: " + error );
			process.exit( 0 );
		} );
} );
