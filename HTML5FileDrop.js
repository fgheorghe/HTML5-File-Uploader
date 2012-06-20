/**
 @class HTML5 File drop
 @param {Object} config Configuration object, having the folowing properties:<br/>
 targetElement: DOM element to bind drop event to.<br/>
 allowedExtensions: Array of allowed extension regular expressions.<br/>
 imageExtensions: Array of image extension regular expressions.<br/>
 maxFileSize: Stores the maximum file size in bytes. Default to: 466022295 bytes (~404 MB)<br/>
 maxImagePreviewFileSize: Stores the maximum file size in bytes. Default to: 4194304 bytes (~4 MB)<br/>
 onDrop: Drop event listener<br/>
 maxFiles: Maximum number of files to add<br/>
*/
var HTML5FileDrop = function( config ) {
	/**
	 Method used for loading required objects and binding event listeners.
	 @function
	*/
	this.init = function() {
		// Firefox patch, ArrayBuffer slice method.
		if ( !ArrayBuffer.prototype.slice )
			ArrayBuffer.prototype.slice = function ( start, end ) {
				var that = new Uint8Array( this );
				if ( typeof end === "undefined" ) end = that.length;
				var result = new ArrayBuffer( end - start );
				var resultArray = new Uint8Array( result );
				var resultArrayLength = resultArray.length
				for ( var i = 0; i < resultArrayLength; i++ )
					resultArray[i] = that[i + start];
				return result;
			}

		/**
		Stores object configuration.
		@type {Object}
		*/
		this._config = config;

		/**
		Stores image preview content for each file name.
		@type {Object}
		*/
		this._imagePreview = {};

		/**
		Stores file maximum size.
		@type {Number}
		*/
		this._maxFileSize = config.maxFileSize || 466022295;

		/**
		Stores image preview file maximum size.
		@type {Number}
		*/
		this._maxImagePreviewFileSize = config.maxImagePreviewFileSize || 4194304;

		/**
		Stores maximum number of files.
		@type {Number}
		*/
		this._maxFiles = config.maxFiles || 3;

		/**
		Stores allowed extensions regular expressions array configuration. Default to: "([\\d\\D]+.(jpg))" and "([\\d\\D]+.(txt))".
		@type {Array}
		*/
		this._allowedExtensions = config.allowedExtensions || [
			"([\\d\\D]+.(jpg))"
			,"([\\d\\D]+.(txt))"
		];

		/**
		Stores images extensions array configuration. Default to: "([\\d\\D]+.(jpg))" and "([\\d\\D]+.(txt))".
		@type {Array}
		*/
		this._imageExtensionsArray = config.imageExtensionsArray || [
			"([\\d\\D]+.(jpg))"
		];

		/**
		Stores drop target DOM element.
		@type {Object}
		*/
		this._targetElement = config.targetElement;

		// Special hack for firefox: http://hacks.mozilla.org/category/drag-and-drop/as/complete/
		window.ondragover = function( e ) { e.preventDefault(); }
		window.ondrop = function( e ) { e.preventDefault(); }

		// Bind drop event listener
		this._targetElement.bind( "drop", this._createDropListener() );
	}

	/**
	Method used for checking whether a file extension is allowed or not. Returns boolean true or false of allowed or not.
	@function
	@param {String} fileName File name including extension, to verify.
	@param {Array} expressionArray Array of regular expressions used for validating files. If a file does not match at least one of these, the result is false.
	@type {Boolean}
	*/
	this._isAllowed = function( fileName, expressionArray ) {
		var allowed = false
			,expressionLength = expressionArray.length;

		for ( j = 0; j < expressionLength; j++ ) {
			var expression = new RegExp( expressionArray[j], "gi" );

			if ( expression.test( fileName ) ) {
				// This file is allowed
				allowed = true;
				break;
			}
		}

		return allowed;
	}

	/**
	Method used for detecting whether a file is an image or not, based on the imageExtensions config parameter.
	@function
	*/
	this.isImage = function( fileName ) {
		return this._isAllowed( fileName, this._imageExtensionsArray );
	}

	/**
	Method used for fetching an image preview (if any).
	@function
	@param {String} fileName file name.
	*/
	this.getImagePreview = function( fileName ) {
		return this._imagePreview[fileName] ? this._imagePreview[fileName] : false;
	}

	/**
	Method used for generating image previews, based on a list of image files.
	@function
	*/
	this._generatePreviews = function( imageFileList, fileList ) {
		// Pointer to self
		var self = this;

		// Internal preview method
		var generatePreview = function( position ) {
			var file = imageFileList[position]
				,fileListLength = imageFileList.length;
			// Create a new file reader
			var reader = new FileReader();
			reader.onload = ( function( file ) {
				return function( event ) {
					// Set image preview content
					self._imagePreview[file.name] = event.target.result;
					// Move to the next file
					if ( position < fileListLength - 1 ) {
						// Call handler
						generatePreview( ++position );
					} else {
						// All done, trigger onDrop event handler, if any files found
						if ( fileList.length > 0 ) {
							self.onDrop.apply( self, [ fileList ] );
						}
					}
				}
			} )( file );

			// Fetch preview, as base64 encoded string
			reader.readAsDataURL( file );
		}

		// Generate previews starting at position 0
		generatePreview( 0 );
	}

	/**
	 Method used for constructing drop event listener.
	 @function
	*/
	this._createDropListener = function() {
		// Pointer to this object, so the event handler can access our drag drop handler
		var self = this;

		return function( event ) {
			var fileList = []
				,i
				,fileListLength = event.dataTransfer.files.length
				,file
				,pendingPreviews = false
				,imageFileList = [];

			// Remove unallowed files
			for ( i = 0; i < fileListLength; i++ ) {
				if ( self._maxFiles > i && event.dataTransfer.files[i].size <= self._maxFileSize && self._isAllowed( event.dataTransfer.files[i].name, self._allowedExtensions ) ) {
					fileList.push( event.dataTransfer.files[i] );
				}
			}

			// Construct image previews, if any image files are droped
			for ( i = 0; i < fileListLength; i++ ) {
				if ( self.isImage( event.dataTransfer.files[i].name ) && event.dataTransfer.files[i].size < self._maxImagePreviewFileSize ) {
					// We have at least one pending preview
					pendingPreviews = true;
					file = event.dataTransfer.files[i];
					imageFileList.push( file );
				}
			}

			// If we have any pending previews, let them call the handler
			// Othwerwise calle if straight away
			if ( pendingPreviews === false ) {
				// Trigger onDrop event handler, if any files found
				if ( fileList.length > 0 ) {
					self.onDrop.apply( self, [ fileList ] );
				}
			} else {
				self._generatePreviews( imageFileList, fileList );
			}
			// Prevent default browser behaviour
			event.preventDefault( event );
			return false;
		}
	}

	/**
	 Public drop event listener.
	 @param {Array} fileObjectArray File object array, containing files of allowed size and extension.
	 @function
	*/
	this.onDrop = function( fileObjectArray ) {
		if ( config.onDrop ) {
			config.onDrop.apply( this, [ fileObjectArray ] );
		}
	}

	// Return a new drop handler instance
	return this;
}