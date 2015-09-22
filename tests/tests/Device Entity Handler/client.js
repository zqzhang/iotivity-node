var result,
	uuid = process.argv[ 2 ],
	processCallCount = 0,
	processLoop = null,
	discoverHandleReceptacle = {},
	iotivity = require( "../../../index" ),
	testUtils = require( "../../utils" )( iotivity );

console.log( JSON.stringify( { assertionCount: 7 } ) );

// Initialize
result = iotivity.OCInit( null, 0, iotivity.OCMode.OC_CLIENT );
testUtils.stackOKOrDie( "Client", "OCInit", result );

// Set up OCProcess loop
processLoop = setInterval( function() {
	var processResult = iotivity.OCProcess();

	if ( processResult === iotivity.OCStackResult.OC_STACK_OK ) {
		processCallCount++;
	} else {
		testUtils.stackOKOrDie(
			"Client",
			"OCProcess(after " + processCallCount + " successful calls)",
			processResult );
	}
}, 100 );

// Discover
result = iotivity.OCDoResource(
	discoverHandleReceptacle,
	iotivity.OCMethod.OC_REST_DISCOVER,
	iotivity.OC_MULTICAST_DISCOVERY_URI,
	null,
	null,
	iotivity.OCConnectivityType.CT_DEFAULT,
	iotivity.OCQualityOfService.OC_HIGH_QOS,
	function( handle, response ) {

		// We retain the discovery callback until we've found the resource identified by the uuid.
		var returnValue = iotivity.OCStackApplicationResult.OC_STACK_KEEP_TRANSACTION;

		if ( testUtils.findResource( response, uuid ) ) {

			// We've successfully found the resource so let's issue a GET request on it.
			testUtils.assert( "ok", true, "Client: Resource found" );

			doGetRequest( response.addr );
			returnValue = iotivity.OCStackApplicationResult.OC_STACK_DELETE_TRANSACTION;
		}

		return returnValue;
	},
	null );
testUtils.stackOKOrDie( "Client", "OCDoResource(discovery)", result );

function doGetRequest( destination ) {
	var getResult,
		getHandleReceptacle = {};

	getResult = iotivity.OCDoResource(
		getHandleReceptacle,
		iotivity.OCMethod.OC_REST_GET,

		// Intentionally mangle the URI so the device entity handler gets called, not the
		// resource's own entity handler.
		"/a/" + uuid + "-xyzzy",
		destination,
		{
			type: iotivity.OCPayloadType.PAYLOAD_TYPE_REPRESENTATION,
			values: {
				question: "How many angels can dance on the head of a pin?"
			}
		},
		iotivity.OCConnectivityType.CT_DEFAULT,
		iotivity.OCQualityOfService.OC_HIGH_QOS,
		function( handle, response ) {
			var returnValue = iotivity.OCStackApplicationResult.OC_STACK_KEEP_TRANSACTION;

			if ( response &&
					response.payload &&
					response.payload.type === iotivity.OCPayloadType.PAYLOAD_TYPE_REPRESENTATION &&
					response.payload.values &&
					response.payload.values.answer ) {

				// We've received an answer. Let's assert that it's correct, and clean up.
				testUtils.assert( "strictEqual", response.payload.values.answer,
					"You're asking the wrong resource.",
					"Client: Correct response received" );

				returnValue = iotivity.OCStackApplicationResult.OC_STACK_DELETE_TRANSACTION;
				cleanup();
			} else {
				testUtils.die( "Client: Unexpected GET response:\n***\n" +
					JSON.stringify( response, null, 4 ) + "\n***" );
			}

			return returnValue;
		},
		null );
	testUtils.stackOKOrDie( "Client", "OCDoResource(get)", getResult );
}

function cleanup() {
	var cleanupResult;

	if ( processLoop ) {
		clearInterval( processLoop );
		processLoop = null;
	}

	testUtils.assert( "ok", true, "Client: OCProcess succeeded " + processCallCount + " times" );

	cleanupResult = iotivity.OCStop();
	if ( testUtils.stackOKOrDie( "Client", "OCStop", cleanupResult ) ) {
		console.log( JSON.stringify( { killPeer: true } ) );
		process.exit( 0 );
	}
}
