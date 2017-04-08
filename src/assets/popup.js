jQuery( function ( $ ) {
	var
		store = chrome.storage.local,
		fbgn = {
			tkn: '',
			$secs: $( 'section' ),
			$login: $( '#login' ),
			$sets: $( '#settings' ),
			changeSection: function( $sec ) {
				fbgn.$secs.slideUp();
				$sec.slideDown();
			},
			syncF: function( callback ) {
				store.get( [ 'access_token', 'keywords', 'group1', 'group2', 'group3', 'group4', 'group5' ], function ( settings ) {
					fbgn.tkn = settings.access_token;
					var $s = $( '#settings' );
					$.each( settings, function ( k, v ) {
						$s.find( '[name="' + k + '"]' ).val( v );
					} );
					if ( typeof callback == 'function' ) {
						callback();
					}
				} );
			},
			init: function(){
				store.get( 'access_token', function ( v ) {
					console.log( v );
					if ( ! v.access_token ) {
						fbgn.showLogin();
					} else {
						fbgn.showSettings();
					}
				} );
			},
			showLogin: function(){
				fbgn.changeSection( fbgn.$login );
			},
			showSettings: function(){
				fbgn.syncF();

				fbgn.changeSection( fbgn.$sets );
			},
			init: function(){},
			init: function(){},
			init: function(){},
			init: function(){},
		};

	$( '#save-settings' ).click( function () {
		var
			$t = $( this ),
			data = {};
		$t.siblings( '[name]' ).not( '[name*="[]"]' ).each( function () {
			var $$ = $( this );
			data[ $$.attr( 'name' ) ] = $$.val();
		} );
		store.set( data );
	} );

	$( '#reset-settings' ).click( function () {
		if ( ! confirm( 'Are you sure you want to reset all settings? \n You will have to login again.' ) ) {
			return;
		}
		var
			$t = $( this ),
			data = { access_token: '' };
		$t.siblings( '[name]' ).not( '[name*="[]"]' ).each( function () {
			var $$ = $( this );
			$$.val( '' );
			data[ $$.attr( 'name' ) ] = $$.val();
		} );
		store.set( data );
		alert();
	} );
} );
