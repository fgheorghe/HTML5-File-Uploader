<?php
/*
Copyright (c) 2012, Bridgeman Art Library
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL Bridgeman Art Library BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
	/**
	 * @file upload.php
	*/

	// Start session
	session_start();

	/**
	 * Maximum file size, in bytes.
	*/
	define( "MAX_FILE_SIZE", 466022295 );

	/**
	 * Chunk size, in bytes.
	*/
	define( "CHUNK_SIZE", 1048576 );

	/**
	 * Path to file upload folder.
	*/
	define( "FOLDER_PATH", "./uploads/" );

	/**
	 * Path to file upload temporary folder.
	*/
	define( "TMP_FOLDER_PATH", "./uploads/" );

	/**
	 * Allowed characters: any digit, any alphabet character (lower or upper calse, whitespace, -,_,(,), a single '.' and any of these extensions: jpeg, jpg, png or txt
	*/
	define( "ALLOWED_FILES", '/(^[\da-zA-Z \-_\(\)]+.(jpeg)|(jpg)|(png)|(txt)$)/' );

	/**
	 * @class FileUploadApi
	 * Provides HTML5 file upload functionality.
	*/
	class FileUploadApi {
		/**
		 * Method used for checking whether this file name is allowed or not.
		 *
		 * @param fileName
		 *	String file name.
		 * @return
		 *	Boolean true of false if allowed or not.
		*/
		public static function isAllowed( $fileName ) {
			// Check file name:
			if ( !preg_match( ALLOWED_FILES, $fileName ) ) {
				return false;
			}

			return true;
		}

		/**
		 * Method used for generating a random temporary file name.
		 * @param fileName
		 *	String original file name.
		 * @return
		 *	String random file name, having the folowing format: original_file_name.extension.TMPNUMBER
		*/
		public static function getRandomFileName( $fileName ) {
			// Initial temporary file name
			$temporary = $fileName . "." . rand( 1000000, getrandmax() );
			// Create a new name as long as this name is already in user by a different process
			while ( file_exists( FOLDER_PATH . $temporary ) ) {
				// Get new name
				$temporary = $fileName . "." . rand( 1000000, getrandmax() );
			}

			return $temporary;
		}

		/**
		 * Method used for moving a temporary file to it's original name / location
		 * @param temporaryFileName
		 *	String temporary file name.
		 * @param originalFileName
		 *	String original file name.
		*/
		public static function moveTempFile( $temporaryFileName, $originalFileName ) {
			rename( TMP_FOLDER_PATH . $temporaryFileName, FOLDER_PATH . $originalFileName );
		}

		/**
		 * Method used for storing a file.
		 * @param temporaryFileName
		 *	String temporary file name.
		 * @param originalFileName
		 *	String original file name.
		 * @param chunkCount
		 *	Integer chunk count.
		 * @param currentChunk
		 *	Integer current chunk.
		 * @return
		 *	Boolean true or false if upload succeeded or not.
		*/
		public static function uploadFile( $temporaryFileName, $originalFileName, $chunkCount, $currentChunk ) {
			if ( self::isAllowed( $originalFileName ) ) {
				// Read data
				$content = fopen( "php://input", "r" );

				while ( $line = fread( $content, 1024 ) ) {
					// Validate chunk size
					if ( strlen( $line ) > CHUNK_SIZE ) {
						return false;
					}
					// Validate file size
					if ( file_exists( TMP_FOLDER_PATH . $temporaryFileName ) && filesize( TMP_FOLDER_PATH . $temporaryFileName ) > MAX_FILE_SIZE ) {
						return false;
					}
					// Append to file
					file_put_contents(
						TMP_FOLDER_PATH . $temporaryFileName
						,$line
						,FILE_APPEND
					);
				}

				fclose( $content );

				// If this is the last chunk, move temporary file to original file
				if ( $chunkCount == $currentChunk ) {
					self::moveTempFile( $temporaryFileName, $originalFileName );
				}

				return true;
			}

			return false;
		}
	}

	// Get file name
	$fileName = $_SERVER['HTTP_X_FILE_NAME'];

	// Get chunk count
	$chunkCount = $_SERVER['HTTP_X_CHUNK_COUNT'];

	// Get current chunk
	$currentChunk = $_SERVER['HTTP_X_CHUNK_CURRENT'];

	// Only generate a random file name, when uploading first chunk
	if ( $currentChunk == 0 ) {
		$_SESSION[$fileName]["randomName"] = FileUploadApi::getRandomFileName( $fileName );
	}

	$temporaryFileName = $_SESSION[$fileName]["randomName"];

	// Upload file
	if ( !FileUploadApi::uploadFile( $temporaryFileName , $fileName, $chunkCount, $currentChunk ) ) {
		// Return a 403 status
		header( "HTTP/1.1 403 Forbidden" );
		die( "Invalid file name:" . htmlspecialchars( $fileName ) );
	}