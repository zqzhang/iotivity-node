// Persistent storage handler
//
// Creates a directory structure of the following form:
// ${HOME}/.iotivity-node
//    |
//    +-- <per-app-path-0>
//    |
//    +-- <per-app-path-1>
//    |
//   ...
//    |
//    +-- <per-app-path-n>
// <per-app-path-n> is constructed from process.argv[1] by replacing '/' and ':' characters with
// underscores.
//
// File names passed to open have no path component, so they will be created under
// ${HOME}/.iotivity-node/<per-app-path-n>

var _ = require( "lodash" ),
	sha = require( "sha.js" ),
	fs = require( "fs" ),
	maybeMkdirSync = function( path ) {
		try {
			fs.mkdirSync( path );
		} catch ( theError ) {
			if ( theError.code !== "EEXIST" ) {
				throw theError;
			}
		}
	},
	path = require( "path" ),
	StorageHandler = function() {
		if ( !this._isStorageHandler ) {
			return new StorageHandler();
		}

		var rootDirectory = path.join( process.env.HOME, ".iotivity-node" );
		var myDirectory = path.join( rootDirectory,

			// We hash the absolute path to the top-level script to create the directory where we
			// store the files for this instance
			sha( "sha256" ).update( process.argv[ 1 ], "utf8" ).digest( "hex" ) );

		maybeMkdirSync( rootDirectory );
		maybeMkdirSync( myDirectory );
		this._directory = myDirectory;
	};

_.extend( StorageHandler.prototype, {
	_isStorageHandler: true,
	open: function( filename, mode ) {
		var fd,
			absolutePath = path.join( this._directory, filename );

		// If the requested file does not exist, create it and fill it with basic info
		try {
			fd = fs.openSync( absolutePath, "wx" );

			// This will cause iotivity to generate a deviceId and store it to the file
			fs.writeSync( fd, JSON.stringify( { doxm: {} } ) );
			fs.closeSync( fd );
		} catch ( theError ) {
			if ( theError.message.substr( 0, 6 ) !== "EEXIST" ) {
				throw theError;
			}
		}

		// Open the file in the requested mode
		fd = fs.openSync( absolutePath, mode );
		fd = ( fd === undefined ? -1 : fd );
		return fd;
	},
	close: function( fp ) {
		fs.closeSync( fp );
		return 0;
	},
	read: function( buffer, totalSize, fp ) {
		return fs.readSync( fp, buffer, 0, totalSize, null );
	},
	write: function( buffer, totalSize, fp ) {
		return fs.writeSync( fp, buffer, 0, totalSize, null );
	},
	unlink: function( path ) {
		fs.unlinkSync( path );
		return 0;
	}
} );

module.exports = StorageHandler;
