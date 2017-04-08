var url = window.location.href;
console.log( 'FB group Notifs' );
console.log( url.indexOf( 'nick.iex.uno/?chrome_extension' ) );
if ( url.indexOf( 'nick.iex.uno/?chrome_extension' ) ) {
	getAccessToken( url );
}

function getAccessToken( url ) {
	access = url.split( '#' )[1].split( '&' )[0];
	access = access.replace( 'access_token=', '' );
	chrome.storage.local.set(
		{ access_token: access },
		function () {
			console.log( 'Access Token set' );
			window.close();
		}
	);
}
