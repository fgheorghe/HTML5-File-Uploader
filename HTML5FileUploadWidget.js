(function($) {
	/**
	 @namespace Contains FileUpload widget protoype.
	*/
	var HTML5FileUploadWidget = {
		/**
		 Initialize widget (load required components and bind listeners).
		 @function
		*/
		_init: function() {
			jQuery.event.props.push( "dataTransfer" );
		}
		/**
		 Set up the widget.
		 @function
		*/
		,_create: function() {
			// One uploader per file
			this._uploader = [];
			// File list
			this._fileList = [];

			// Create drop handler
			var self = this;
			this._drop = new HTML5FileDrop( {
				targetElement: $( '#dropTarget' )
				,maxFiles: 8
				,onDrop: function( fileObjectArray ) {
					// Remove any existing divs
					var i, fileListLength = fileObjectArray.length;
					for ( var i = 0; i < fileListLength; i++ ) {
						$( "#file_" + i ).remove();
					}
					// Hide drop target
					$( "#dropTarget" ).hide( 'fast' );
					// Reset uploader array
					self._uploader = [];
					// Reset selection list
					self.selected = {};
					// Store (new) file list
					fileList = fileObjectArray;

					// Show file list
					$( "#fileList" ).show( 'fast' );
					$( "#fileListHeader" ).show( 'fast' );
					$( "#infoText" ).html( 'Please wait' );

					// Hide buttons
					$( "#fileListBottom" ).hide( 'slow' );
					$( "#uploadMore" ).hide( 'fast' );
					$( "#cancelUpload" ).hide( 'fast' );
					$( "#pauseUpload" ).hide( 'fast' );
					$( "#resumeUload" ).hide( 'fast' );

					// Remove existing event handlers
					$( "#startUpload" ).unbind( 'click' );
					$( "#uploadMore" ).unbind( 'click' );
					$( "#pauseUpload" ).unbind( 'click' );
					$( "#resumeUpload" ).unbind( 'click' );
					$( "#cancelUpload" ).unbind( 'click' );

					// Bind listeners
					$( "#startUpload" ).bind( 'click', function() {
						var cleanFileList = [], i, fileListLength = fileList.length, start = null;
						// Construct a new file list, based on selected items
						for ( i = 0; i < fileListLength; i++ ) {
							if ( self.selected[i] === true ) {
								cleanFileList.push( i );
							}
						}
						self.cleanFileList = cleanFileList;
						self.currentFileIndex = 0;

						// Begin uploading, if any file(s) selected
						if ( self.cleanFileList.length > 0 ) {
							// Remove entries
							$( "div[id*=file_]" ).remove();

							// Hide start button and list header
							$( "#startUpload" ).hide( 'fast' );
							$( "#fileListHeader" ).hide( 'slow' );
							// Show control buttons
							$( "#cancelUpload" ).show( 'fast' );
							$( "#pauseUpload" ).show( 'fast' );

							self.currentFile = self.cleanFileList[0];
							self._uploader[self.cleanFileList[0]].uploadFile();
						}
					} );
					$( "#pauseUpload" ).bind( 'click', function() {
						// Pause the current file upload
						self._uploader[self.currentFile].pauseUpload();
						// Hide pause button
						$( "#pauseUpload" ).hide( 'fast' );
						// Show resume button
						$( "#resumeUpload" ).show( 'fast' );
					} );
					$( "#resumeUpload" ).bind( 'click', function() {
						// Pause the current file upload
						self._uploader[self.currentFile].resumeUpload();
						// Show pause button
						$( "#pauseUpload" ).show( 'fast' );
						// Hide resume button
						$( "#resumeUpload" ).hide( 'fast' );
					} );
					$( "#uploadMore" ).bind( 'click', function() {
						// Remove 'done' items from list
						$( "div[id*=file_]" ).remove();
						// Hide slef
						$( "#uploadMore" ).hide( 'fast' );
						// Hide file list
						$( "#fileList" ).hide( 'fast' );
						// Hide list bottom
						$( "#fileListBottom" ).hide( 'slow' );
						// Show drop target
						$( "#dropTarget" ).show( 'fast' );
					} );
					$( "#cancelUpload" ).bind( 'click', function() {
						// Cancel the current upload
						if ( self._uploader[self.currentFile] ) {
							self._uploader[self.currentFile].cancelUpload();
						}

						// Hide buttons
						$( "#fileList" ).hide( 'fast' );
						$( "#fileListBottom" ).hide( 'slow' );
						$( "#fileListHeader" ).hide( 'slow' );
						$( "#startUpload" ).hide( 'fast' );
						$( "#cancelUpload" ).hide( 'fast' );
						$( "#pauseUpload" ).hide( 'fast' );
						$( "#resumeUpload" ).hide( 'fast' );
						$( "#fileProgressBar" ).hide( 'fast' );
						$( "#fileProgressBarHolder" ).hide( 'fast' );
						$( "#fileProgressText" ).hide( 'fast' );
						// Show drop target
						$( "#dropTarget" ).show( 'fast' );
					} );

					// Show parse progress text
					$( "#parseProgressText" ).show( 'fast' );
					$( "#parseProgressBarLine" ).attr( 'width', 0 );
					$( "#parseProgressBar" ).show( 'fast' );

					// Import files (read buffers), starting with the first entry
					self._importFile( 0, fileObjectArray, function() {
						// Hide parse progress and text
						$( "#parseProgressBar" ).hide( 'slow' );
						$( "#parseProgressText" ).hide( 'slow' );
						// Show upload button and list items
						$( "#infoText" ).html( 'Select files to upload' );
						$( "#fileListBottom" ).show( 'fast' );
						$( "#startUpload" ).show( 'slow' );
						$( "#cancelUpload" ).show( 'slow' );
					} );
				}
			} );

			// Initialize the object
			this._drop.init();
		}
		,open: function() {
			// Do nothing
		}
		/**
		 Method used for importing files.
		 @function
		 @param {Number} position Position of file within the fileObjectArray.
		 @param {Array} fileObjectArray File object array, as returned by the onDrop event.
		 @param {Function} onImportFinished Callback method called once the process is done.
		*/
		,_importFile: function( position, fileObjectArray, onImportFinished ) {
			// Stop the process if we have imported all files
			if ( position > fileObjectArray.length - 1 ) {
				// Call function
				onImportFinished.apply( this, [] );
				// Stop process
				return;
			}

			// Create a new uploader instance
			var self = this;
			self.selected = {}; // Selected items to upload
			this._uploader[position] = new HTML5FileUpload( {
				// Upload url
				url: 'upload.php?XDEBUG_PROFILE=1'
				// File object
				,file: fileObjectArray[position]
				// Progress change handler
				,onParseProgress: function( progressEvent ) {
					var percentComplete = progressEvent.loaded / progressEvent.total;
					$( "#parseProgressBarLine" ).css( 'width', this._maxWidth * percentComplete );
				}
				// Parse load end
				,onParseLoad: function() {
					var imagePreview = "";
					$( "#parseProgressBarLine" ).css( 'width', this._maxWidth );
					// Construct image thumbnail source code
					if ( self._drop.isImage( this._config.file.name ) && self._drop.getImagePreview( this._config.file.name ) ) {
						// Construct image code
						imagePreview = self._drop.getImagePreview( this._config.file.name );
						// Construct image tag
						imagePreview = "<td><img src='" + imagePreview + "' height='10' width='10' /></td>";
					}

					$( "#fileList" ).append( "<div id='file_" + position + "' name='file_" + position + "'><table height='100%' width='100%' cellpadding='0' cellspacing='0' border='0'><tr valign='middle'><td><input type='checkbox' name='file_checkbox_" + position + "' id='file_checkbox_" + position + "'></td>" + imagePreview + "<td width='100%'>" + this._config.file.name + "</td></tr></table></div>" );

					// Bind checkbox listener
					$( "#file_checkbox_" + position ).bind( 'click', function() {
						self.selected[position - 1] = this.checked;
					} );
					// Move to the next file
					self._importFile( ++position, fileObjectArray, onImportFinished );
				}
				// Parse start
				,onParseStart: function() {
					// Update parse progress text
					$( "#parseProgressText" ).html( 'Parsing file: ' + this._config.file.name );
					// Reset progress bar width
					this._maxWidth = $( "#parseProgressBar" ).innerWidth() - 2;
					$( "#parseProgressBarLine" ).css( 'width', 0 );
				}
				// Upload progress change
				,onUploadProgressChange: function( percentage ) {
					// Set progress bar width
					$( "#fileProgressBar" ).width( $( "#fileProgressBarHolder" ).innerWidth() * percentage / 100 );
				}
				// Upload start
				,onUploadStart: function() {
					// Show progress bar
					$( "#fileProgressBar" ).width( 0 ); // Set width to 0
					$( "#fileProgressBar" ).show( 'fast' );
					$( "#fileProgressBarHolder" ).show( 'fast' );
					// Set progress text
					$( "#fileProgressText" ).html( 'Uploading: ' + this._config.file.name );
					// Show progress text
					$( "#fileProgressText" ).show( 'fast' );
				}
				,onUploadEnd: function() {
					// Get the next selected file
					if ( self.currentFileIndex < self.cleanFileList.length ) {
						// Add to complete list
						$( "#fileList" ).append( "<div id='file_" + self.currentFileIndex + "' name='file_" + self.currentFileIndex + "'><table height='100%' width='100%' cellpadding='0' cellspacing='0' border='0'><tr valign='middle'><td>Done:&nbsp;</td><td width='100%'>" + this._config.file.name + "</td></tr></table></div>" );
						// Move next
						try {
							self._uploader[self.cleanFileList[++self.currentFileIndex]].uploadFile();
							return;
						} catch ( ex ) {
							// Do nothing
						}
					}
					// Free memory and hide buttons and progress bar
					// Hide progress bar
					$( "#fileProgressBar" ).width( 0 );
					$( "#fileProgressBar" ).hide( 'fast' );
					// Hide progress text
					$( "#fileProgressText" ).hide( 'fast' );
					$( "#pauseUpload" ).hide( 'fast' );
					$( "#cancelUpload" ).hide( 'fast' );
					// Display upload more button
					$( "#uploadMore" ).show( 'fast' );
					// Free memory
					// TODO: Verify!
					self._uploader = [];
				}
			} );

			// Initialize object
			this._uploader[position].init();

			// Parse content
			this._uploader[position].parseContent();
		}

		/**
		 These options will be used as defaults.
		 @type {Object}
		*/
		,options: {
		}
		/**
		 Use the destroy method to clean up any modifications your widget has made to the DOM.
		 @function
		*/
		,destroy: function() {
			// In jQuery UI 1.8, you must invoke the destroy method from the base widget
			$.Widget.prototype.destroy.call( this );
			// In jQuery UI 1.9 and above, you would define _destroy instead of destroy and not call the base method
		}
	}

	// Create the widget
	$.widget( "BridgemanArt.HTML5FileUploadWidget", HTML5FileUploadWidget );
}( jQuery ) );