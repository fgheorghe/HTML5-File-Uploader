/**
 @class HTML5 File uploader
 @param {Object} config Configuration object, having the folowing properties:<br/>
 url: url to send post data to<br/>
 file: file object to handle<br/>
 onParseProgress: callback function for the onParseProgress event handler.<br/>
 onParseAbort: callback function for the onParseProgress event handler.<br/>
 onParseLoad: callback function for the onParseProgress event handler.<br/>
 onParseError: callback function for the onParseProgress event handler.<br/>
 onParseError: callback function for the onParseProgress event handler.<br/>
 onUploadStart: callback function for the onUploadStart event hanlder.<br/>
 onUploadError: callback function for the onUploadError event hanlder.<br/>
 onUploadEnd: callback function for the onUploadEnd event hanlder.<br/>
 onChunkSent: callback function for the onChunkSent event handler.<br/>
 chunkSize: upload chunk size in bites. Default to 1048576 (1MB).<br/>
*/
var HTML5FileUpload = function( config ) {
	/**
	 Method called upon file parsing progress, triggered by the HTML5 onprogress event.
	 @function
	 @param {Object} progressEvent Progress event, having the .loaded and .total properties.
	*/
	this.onParseProgress = function() {
		// 'Pointer' to self
		var self = this;

		return function( progressEvent ) {
			// Call event handler
			if ( typeof config.onParseProgress !== "undefined"  ) {
				config.onParseProgress.apply( self, [ progressEvent ] );
			}
		}
	}

	/**
	 Method called upon file parsing start, triggered by the HTML5 onloadstart event.<br/>
	 @function
	*/
	this.onParseStart = function() {
		// 'Pointer' to self
		var self = this;

		return function() {
			// Call event handler
			if ( typeof config.onParseStart !== "undefined"  ) {
				config.onParseStart.apply( self, [] );
			}
		}
	}

	/**
	 Method called upon file parsing load, triggered by the HTML5 onload event.<br/>
	 NOTE: The the onloadend event is ignored. We only need the onload and onerror event handlers, since onloadend is called after either of these occurred.
	 @function
	 @param {Object} loadEvent Load event.
	*/
	this.onParseLoad = function() {
		// 'Pointer' to self
		var self = this;

		return function( loadEvent ) {
			// Convert to Uint8Array and store data into this._arrayBuffer.
			self._arrayBuffer = new Uint8Array( loadEvent.target.result );

			// Count the number of chunks
			self._chunkCount = parseInt( self._arrayBuffer.length / self._chunkSize, 10 );

			// Call custom event handler
			if ( typeof config.onParseLoad ) {
				config.onParseLoad.apply( self, [ loadEvent ] );
			}
		}
	}

	/**
	 Method called upon file parsing abort, triggered by the HTML5 onabort event.
	 @function
	*/
	this.onParseAbort = function() {
		// 'Pointer' to self
		var self = this;

		return function() {
			// Call event handler
			if ( typeof config.onParseAbort !== "undefined"  ) {
				config.onParseAbort.apply( self, [] );
			}
		}
	}

	/**
	 Method called upon file parsing error, triggered by the HTML5 onerror event.
	 @function
	*/
	this.onParseError = function() {
		// 'Pointer' to self
		var self = this;

		return function() {
			// Call event handler
			if ( typeof config.onParseError !== "undefined"  ) {
				config.onParseError.apply( self, [] );
			}
		}
	}

	/**
	 Method called upon file upload start.
	 @function
	*/
	this.onUploadStart = function() {
		// 'Pointer' to self
		var self = this;

		return function() {
			// Call event handler
			if ( typeof config.onUploadStart !== "undefined"  ) {
				config.onUploadStart.apply( self, [] );
			}
		}
	}

	/**
	 Method called upon file upload end.
	 @function
	*/
	this.onUploadEnd = function() {
		// 'Pointer' to self
		var self = this;

		return function() {
			// Call event handler
			if ( typeof config.onUploadEnd !== "undefined"  ) {
				config.onUploadEnd.apply( self, [] );
			}
		}
	}

	/**
	 Method used for constructing the FileReader object.
	 @function
	 @param {fileObject} File object to parse.
	*/
	this._constructFileReader = function( fileObject ) {
		this.fileReader = new FileReader();
		// Bind event handlers
		this.fileReader.onload = this.onParseLoad(); // Load end
		this.fileReader.onloadstart = this.onParseStart(); // Load start
		this.fileReader.onprogress = this.onParseProgress(); // Load progress
		this.fileReader.onabort = this.onParseAbort(); // Load abort
		this.fileReader.onerror = this.onParseError(); // Load error
	}

	/**
	 Method used for constructing the XHR object, for each chunk to be sent.
	 @function
	*/
	this._constructXhrObject = function() {
		// Prepare the XMLHttpRequest object
		this._client = new XMLHttpRequest();

		// Open connection
		this._client.open( 'POST', config.url, true );

		// Set request headers
		this._client.setRequestHeader( "Cache-Control", "no-cache" );
		this._client.setRequestHeader( "X-File-Name", config.file.name );
		this._client.setRequestHeader( "X-Chunk-Count", this._chunkCount );
		this._client.setRequestHeader( "X-Chunk-Current", this._currentChunk );
	}

	/**
	  Method called once a chunk has been sent, triggered by XHR loadend event.
	  @param {Number} chunkNumber Sent chunk number. If missing, the object has sent the header.
	  @function
	*/
	this.onChunkSent = function( chunkNumber ) {
		// 'Pointer' to self
		var self = this;

		// Increment current chunk number
		if ( typeof chunkNumber !== "undefined" ) {
			this._currentChunk++;
		}

		return function() {
			// Call event handler
			if ( typeof config.onChunkSent !== "undefined" ) {
				config.onChunkSent.apply( self, [ chunkNumber ] );
			}

			// Move to next chunk, unless paused or we reached the last chunk
			if ( !self._paused && self._currentChunk <= self._chunkCount ) {
				self._sendChunk( self._currentChunk );
			} else if( self._currentChunk > self._chunkCount ) {
				// Call upload end handler
				self.onUploadEnd()();
			}
		}
	}

	/**
	 Method called upon file upload error triggered by the XMLHttpRequest onerror event.
	 @function
	*/
	this.onUploadError = function() {
		var self = this;

		return function() {
			// Call custom error handler
			if ( typeof config.onUploadError !== "undefined" ) {
				config.onUploadError.apply( self, [] );
			}
		}
	}

	/**
	 Method called upon file upload progress change triggered by the XMLHttpRequest onprogresschange event.
	 NOTE: This, along with the chunk number will construct a new progress value.
	 @function
	 @param {Number} percentage Perecent of data sent (in %).
	*/
	this.onUploadProgressChange = function( percentage ) {
		// 'Pointer' to self
		var self = this;

		return function( progressEvent ) {
			var percentage;
			// Ignore the header request
			if ( self._currentChunk === 0 ) {
				return;
			}
			// Set the last request to 100, so we ignore the last bits which have not been counted.
			if ( self._currentChunk >= self._chunkCount ) {
				percentage = 100;
			} else {
				// Detect percentage from the previous to the current chunk
				percentage = 100 / ( self._chunkCount - 1 ) * ( self._currentChunk - 1 );
				// Add the percentage completed of this bit, up to the next bit (progress between chunks)
				percentage = percentage + progressEvent.loaded / progressEvent.total / 100;
			}
			// Call event handler
			if ( typeof config.onUploadProgressChange !== "undefined"  ) {
				config.onUploadProgressChange.apply( self, [ percentage ] );
			}
		}
	}

	/**
	 Method used for sending each chunk.<br/>
	 @function
	 @param {Number} chunkNumber Chunk number to send.
	*/
	this._sendChunk = function( chunkNumber ) {
		var content;

		// Ignore request if this process had been canceled
		if ( this._arrayBuffer === null ) {
			return;
		}

		// Send file data, for this chunk
		content = this._arrayBuffer.buffer.slice( chunkNumber * this._chunkSize, chunkNumber * this._chunkSize + this._chunkSize );

		// Construct Xhr object required for this chunk
		this._constructXhrObject();

		// Bind listener
		this._client.onloadend = this.onChunkSent( chunkNumber );
		// Bind progress listener
		this._client.upload.onprogress = this.onUploadProgressChange();
		// Bind error listener
		this._client.upload.onerror = this.onUploadError();

		// Send data
		this._client.send( content );
	}

	/**
	 Method used for loading required objects and binding event listeners.
	 @function
	*/
	this.init = function() {
		/**
		Stores file content as Uint8Array.
		@type {Uint8Array}
		*/
		this._arrayBuffer = null;

		/**
		Chunk size (default to 1MB / chunk). Configurable trough config.chunkSize.
		@type {Number}
		*/
		this._chunkSize = config.chunkSize || 1048576;

		/**
		Stores object configuration.
		@type {Object}
		*/
		this._config = config;

		/**
		Stores the number of chunks.<br/>
		NOTE: Chunk count starts from 0. As such, if a file is smaller than this._chunkSize, this._chunkCount is 0.
		@type {Number}
		*/
		this._chunkCount = 0;

		/**
		Stores the current chunk to be sent. Useful for pausing and resuing an upload.
		@type {Number}
		*/
		this._currentChunk = 0;

		/**
		Stores the paused property, default to false.
		@type {Boolean}
		*/
		this._paused = false;

		/**
		Stores XMLHttpRequest
		@type {Object}
		*/
		this._client = null;
	}

	/**
	 Method used for starting a file upload.
	 @function
	*/
	this.uploadFile = function() {
		// Call the upload start event handler
		this.onUploadStart()();

		// Start by sending the header
		this._sendChunk( 0 );
	}

	/**
	 Method used for loading content into memory, stored into this._arrayBuffer as Uint8Array.
	 @function
	*/
	this.parseContent = function() {
		// Construct FileReader
		this._constructFileReader( config.file );

		// Read data
		this.fileReader.readAsArrayBuffer( config.file );
	}

	/**
	 Method used for pausing an upload.
	 @function
	*/
	this.pauseUpload = function() {
		this._paused = true;
	}

	/**
	 Method used for resuming an upload.
	 @function
	*/
	this.resumeUpload = function() {
		// Ignore this call if already paused
		if ( this._paused === false ) {
			return;
		}
		// Resume
		this._paused = false;
		// Move to next chunk, unless we already sent the last chunk
		if ( this._currentChunk <= this._chunkCount ) {
			this._sendChunk( this._currentChunk );
		}
	}

	/**
	 Method used for canceling an upload.
	 @function
	*/
	this.cancelUpload = function() {
		// Pause upload
		this.pauseUpload();
		// Reset objects
		this.init();
	}

	// Return a new uploader instance
	return this;
}