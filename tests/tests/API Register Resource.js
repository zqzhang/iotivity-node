var testUtils = require( "../assert-to-console" );

console.log( JSON.stringify( { assertionCount: 1 } ) );

var device = require( "../../index" )();
var settings = {
	role: "server",
	info: {
		uuid: "INTEL"
	}
};

device.configure( settings );

if ( device.settings.info.uuid ) {
	var deviceId = device.settings.info.uuid;

	device.registerResource( {
		id: { path: "/light/ambience/blue" },
		deviceId: deviceId,
		resourceTypes: [ "core.light" ],
		interfaces: [ "oic.if.baseline" ],
		discoverable: true,
		observable: true,
		properties: { color: "light-blue", dimmer: 0.2 }
	} ).then(
		function() {
			testUtils.assert( "ok", true, "Resource registered successfully" );
			process.exit( 0 );
		},
		function( error ) {
			testUtils.assert( "ok", false,
				"Resource not registered, error with code: " + error.result );
			process.exit( 0 );
		} );
}
