/**
 * Created by shramee on 01/04/17.
 */
var fbgn = {
	keywords: '',
	tkn: '',
	grpURLs: [],
	grpIDs: [],
	grpMeta: {},
	_settingsChanged: 0,

	addGrpId: function( id, name ){
		name = name ? name : 'Unknown';
		fbgn.grpIDs.push( id );
		fbgn.grpMeta[id] = {
			timestamp: Math.floor( Date.now() / 1000 ) - 7000, // Roughly since 2 hours ago
			name: name
		};
	},

	_stopLoop: 0,
	stopLoop: function() { fbgn._stopLoop = 1; },
	loopGroups: function( callback, groups ) {
		groups = groups ? groups : fbgn.grpURLs;
		for ( var i = 0; i < groups.length; i++ ) {
			callback( groups[i], i );
			if ( fbgn._stopLoop ) { // Mechanism for stopping loop
				fbgn._stopLoop = 0;
				return;
			}
		}
	},

	errorLog: function( error ) {
		console.log( error );
		chrome.storage.local.get( 'errors', function ( dt ) {
			if ( ! dt.errors || ! dt.errors.length ) {
				dt.errors = [];
			} // Create empty array if no errors
			if ( 4 < dt.errors.length ) {
				dt.errors.splice( 0, 1 );
			} // Maximum 5 errors
			dt.errors.push( error ); // Add the latest error
			chrome.storage.local.set( dt );
		} );
	},

	_generatingToken: 0,
	generateToken: function() {
		if ( ! fbgn._generatingToken ) {
			fbgn._generatingToken = 1;
			chrome.storage.local.get( 'token_url', function ( dt ) {
				if ( dt.token_url ) {
					chrome.tabs.create( { url: dt.token_url } );
					fbgn.tkn = '';
				}
			} );
		}
	},

	fbQry: function( qry, callback ) {
		qry += -1 < qry.indexOf( '?' ) ? '&' : '?'; // Add delimiter to appending access token
		console.log( qry );
		var url = 'https://graph.facebook.com/' + qry + 'access_token=' + fbgn.tkn;
		$.get( url, callback )
		 .fail( function ( er ) {
			 var err = JSON.parse( er.responseText );
			 if ( err && err.error ) {
				 if ( -1 < err.error.message.indexOf( 'access token' ) ) {
					 fbgn.generateToken(); //Try to get token
				 } else {
					 fbgn.errorLog( err ); // Unknown error, log
				 }
			 } else {
				 fbgn.errorLog( er ); // Unknown error format, log
			 }
			 fbgn.stopLoop();
		 } );
	},

	getGroupInfoFromID: function ( idStr ) {
		fbgn.fbQry( idStr,
			function ( response ) {
				if ( response && response.id ) {
					var grp = response;
					console.log( grp );
					if ( grp.privacy == 'OPEN' ) {
						fbgn.addGrpId( grp.id, grp.name );
					}
				}
			} );
	},
	getGroupIDFromAlias: function ( idStr ) {
		fbgn.fbQry( 'search?q=' + idStr + '&type=group',
			function ( response ) {
				if ( response && response.data && response.data.length ) {
					var grp = response.data[0];
					console.log( grp );
					if ( grp.privacy == 'OPEN' ) {
						fbgn.addGrpId( grp.id, grp.name );
					}
				}
			} );
	},
	getGroups: function () {
		fbgn.loopGroups( function ( url ) {
			var
				id = 0,
				idStr =
					url
						.replace( /http[s]?:\/\/(www)?\.?facebook.com\/groups\//, '' )
						.replace( /\/\??[A-z=&0-9\/]*$/, '' );

			if ( parseInt( idStr ) == idStr ) {
				fbgn.getGroupInfoFromID( idStr );
			} else {
				fbgn.getGroupIDFromAlias( idStr );
			}
		}, fbgn.grpURLs );
	},

	setAlarm: function () {
		chrome.alarms.create( 'fbgnNotify', {
			delayInMinutes: 1,
			periodInMinutes: 1,
		} );
	},

	init: function () {
		chrome.storage.local.get( [
			'access_token', 'keywords', 'group1', 'group2', 'group3', 'group4', 'group5'
		], function ( data ) {
			$.each( data, function( k,v ) {
				if ( -1 < k.indexOf( 'group' ) ) {
					fbgn.grpURLs.push( v );
				} else if ( -1 < k.indexOf( 'keywords' ) ) {
					fbgn.keywords = v.replace( /[ ,]+/g, ',' ).split( ',' );
				} else if ( -1 < k.indexOf( 'access_token' ) ) {
					fbgn.tkn = v;
				}
			} );
			if ( fbgn.grpURLs.length && fbgn.keywords && fbgn.tkn ) {
				fbgn.getGroups();
				fbgn.setAlarm();
			}
		} );
	},

	runCheckToken: function() {
		if ( ! fbgn.tkn ) {
			chrome.storage.local.get( 'access_token', function ( dt ) {
				if ( dt.access_token ) {
					fbgn.tkn = dt.access_token;
				}
			} );
			return false;
		} else {
			return fbgn.tkn;
		}
	},
	runSettingsChanged: function () {
		if ( typeof fbgn.runSettingsChanged.changed != 'undefined' && fbgn.runSettingsChanged.changed ) {

			return true;
		} else {
			chrome.storage.local.get( 'settingsChanged', function( dt ) {
				chrome.storage.local.set( {settingsChanged: 0} );
				if ( dt.settingsChanged ) {
					fbgn._settingsChanged = true;
				} else {
					fbgn._settingsChanged = false;
				}
			} );
		}
	},
	processGrp: function( id ) {
		var
			grpM = fbgn.grpMeta[id],
			url = id + '/feed?since=' + grpM.timestamp;
		grpM.timestamp = Math.floor( Date.now() / 1000 ) - 5; // 5 second ago
		fbgn.fbQry( url, function( response ) {
			if ( response.data && response.data.length ) {
				var posts = response.data;
				for ( var i = 0; i < posts.length; i++ ) {
					var
						msg = posts[i].message.toLowerCase(),
						pid = posts[i].id;
					for ( var ki = 0; ki < fbgn.keywords.length; ki++ ) {
						var kw = fbgn.keywords[ki];
						if ( -1 < msg.indexOf( kw ) ) {
							var notif = {
								type: 'basic',
								title: 'Match found for ' + kw + '.',
								message: 'Post in group ' + grpM.name + ' matched keyword ' + kw,
								iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAAA3NCSVQICAjb4U/gAAAACXBIWXMAABzhAAAc4QHFWrCAAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAvRQTFRF////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxRfo/QAAAPt0Uk5TAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1haW1xdXl9gYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBw8TFxsfIycrLzM3Oz9DR0tPU1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7+FFZjAAALPklEQVR42u2de1xVRR7ABy4GooKPdF1BpXxmqGTrY0PXXB+0GEnqhpUolOj2UHfLx6qZmrpK1rYWuPjgYW5l5jNUkhTJZ5qihpaYr1QM8YHCBe6988/+0WfL9c65M7+55zCHw+/3//3O7/flcM6cmTkzhHDD1jd+6ntr87akzRkf05SYPgIGJcx4f/3uDSmzXohq4D2uwYisa/TXcOyaGGbm6puNWX/7rnQrNic094oXml5B3WL/ILOWH77Z4Zatc2uENC94YTllRk6EGcsPWelkZutaLXnRvlBCtcKVFWy28n1nl2uma19UDw6sl0o9RWEHc9UfvNVjunn3g+8medRzlA42U/3tCznpnukKBJ6hvHCMM0/9fUu56ZZFgS6oQsoPZ7RZ6n+wRCDdW+HiQNs2KhI3HzJH/Y1OCKV7Rvw+sISKxfem6Bj6bhFMN0/0WfA0FY1NZhAwXTjdRWJAv++EibS/+vpblAlna28rRPyLeP30gHoBKYB0s4Ref64AiHSk6vo7VgOydXYTIP4dUj895aNYwFpQupsFiN+CiLSn2vob2kHZVjfhEjvB6qdvqRUwEpju81ziNCDxuFoBq4HpfsolHgAS6YMq6/crBWZb5s8hNnZBBSSpFNAbmi235xIOJi6oTbcASuM5xMFgYoZKAa+A053GIcaDiTtUClgATncphzgVTPxWpYB0cLrrOcRFYGKx7Fts+BMJM1M2Zi+fkxTzqL8kZBM43d0c4utg4gmZxANiVhT/39Np3WipsYWV4HTXcYjPg4k58LSHrr/DGGPcNQ4+eP0WON33OMSBYOIqaNK/z9ccYfozlPUSON0pHGIXMHEeLOWHNniCHXwcRhsOTvc53gCjE0pMhCTsM9vBwX1YH8LrARYQyUPuhhJDAfnW/4TP+zoE8igpBmZb6sdDTgISDwHSDTkkQrzUC4BcAUz3Qy4xDEicBbhefxRDVsSJM58Epitwmz0CI4rPubUWHmys/qN4h+I2KFt7Iz5yIoh4RDjVwG/EqdfaCWNXgdL9SIDofxZCFJ5y9PkU9IIRJHxdVQCwVe1FkKMBxC+F/1KzYf9Z2b6iYMjbywdij5ajwkDX74RvgNCRpvGi5MYlwsyy34ghBwonmyl8AeRCuxeXhZe4TRBmThdFis6NHAkUJUaBe2x0prDcTEHiRvFJnP8IAa+0Fu6wFcAF3BSezvffJwQ81hDwun5QAFj5mDAPPtBGKX1XGN/yggDupzDIS8Zv+d2h8uHiuIMyAsrEh4m68g0U94a9ZwbyHtsXHhWHtXLJCKBDxVtouZfDOtoGOtTg86bHrPe1BLAmSNVPVwCa8M/wPBAms2w6pki7S70YNIq5XU7AVRukkaSrmqDrk+Um8e+byO5jODNh11NQpZwA+gdYM/PZi2XtyU2IbAQvdB9wqNzYHUh5SrJ+Oh/YUEjaTfdb6ao2xJvwjVx86i7cjY/igsCMl2UFZMEv2qiUi3f3VNKi/Yn30X7ImOn/+nj53AmxPevJ/H6BrACpWTef8OjEmSmfpL7x4pPdfYkpIkNWwAlijfhCVkCJRQSckBVA77OGgB+kBTS2hoB9svXbLfIv8JmsgLMWEbBUVsA+iwiYLitgg0UEjJEVkOK5n942TC5CmQ+XHm9+fvjiFbm4XLgzbZj2+GB3WQHan2V1n1dwh8pHybYX71mQEv4N9TZujdP7OejUGnNouMzrbGnJ3ROQvq/bqQ6xtZVGwv+U4+3RwPU/o0e2dO0vo65t8qk+Uarx+cQAOdxrGu9WLp3SvdL3Z6DtANUrqh5hpux3TYrGniEdrlu29EKwd08pRhxn996Xy7DYSy+aX9Ux3XRCCOlaqSORLmRmHSZzj4nWt1vJjBhCfI/oSnSwP6FZAiflMUGxumZLL9cn/fQl0pXMvJteB4PYExkbdE53GHlXZ+JP7LHsKVDOZ+z5mnKd082Qm7XyFF3Ys40ngfNiHfTtVGpOcJOLeiMHsp/eHUH/BK5YNuVPemdbTKr1RmqtRR3iAEBm6LB8R6y7TfQm0rFabwSA5Weai7nG6p5uDQog/xZF7K9vTQE+s8V68Wu136xrtwBCRgi8xLtmeZjKrQUCKjxurxNxjvv8i/X4+1MmF1CVylns3iLd8wcJOZyNWWyJ58wsYPUDAut5srV/f3SIwFqQv5abVcD1EWKDpAO+Zv/+fLzYbG6XY+YUsEdsixJCCOn2xuF7f130Tn/hFTEBS80oIMWPQKL1y+v2n6+ilFLn5cNbZoSDfkzGOEwnIFlqMUOLiJ4hNplfPlNlMgFzanq25Sm7qQTMIzUeI80kYKuKzXSWmEfAWSWbqvnlm0VApaK9hFpdNYmA+URRjDOHgEsNVQmwFZhCwFh1Kw8GmkHAIZXbqWWbQMCzmtk16DxgWKz3Ef2I9rcJT6gXUBrATi1wcp5+A86nl3Rmt+J7TrkAjT05Ir/XeaDpNfar8mzlAphfjwckO6ne8RXzu9/WTsUCTjP/+Y9RA+LOAFZbBYoFMD+efZ8aEudYH/+nKBbAWhr2uMsYATSN0dhzigU8zPgHKKJGBWO3gjC1AsoYvaBphtVPzzCaK1UqoIhxUW4yTgBlbDBzSqmAgwwB5w0UwHjx3KtUwDb3hO43sH7WXnCfKxXA2JdosJEC9rq3l6lUwDL3hJKMFFDo3t4yswkYb6SAkygABaAAFIACUAAKQAEoAAWgABSAAlAACkABKAAFeCvAUbcF2L3Y5skSAn7wclS51gv4irxatwXMJZF1W0AECfRqdjW1lgvY7u2neLX8CrgRSggh2+qugJ8PH2x9q64K+N/J4XHldVPAil8WXXXcVwcF/Hj3LjW2qfY6JsCefs920+2m7b1TJwS48vJy17wdx/zGIah9586VVhfA26fUjgJQAApAASgABaAAFIACUAAKQAEoAAWgABSAAlAACkABKAAFoAAUgAJQAApAASgABaAAvoBxRgpgnEScoVTAGnfCSCMF7HRvb6dSAdnuhMeMFMAQXqRUAGNTk2ZOAwVMdt9RsEqpgO8YiHwDBYS5tRZKlQpwNHBHvGRc/Yzj6PuqFUAj3RG2g0bVX/aA97vJ6S3gVQaji90gAUmMxmYoFsA8FG6KMfXnsNr6QrGAyuYMiG2LEfXvZR1q26xasQCNo2GTbuldvn0q8ySKRKpaQCGbE/alvvUffpjdTq5yAbQfG+QTm1WiT+3OSwfe7qdxEEkPql5ApjYsuHPvPn36RMvXnhwQEBDg6RCWdSYQUB7MQbaUF/APDrqT0wQC6Ah1AkZRMwgYhQKUCYiDIys4yBtwZKw6AUPgyEsc5Ek4src6AV0lOhQcZC4cGapOQCP4iWMfc5CzwMTTRJ0AkgNGjuYQu4GJ76gUkAC+B3IPxdoOJN5up1KADfrN6994RBIKfA5MICoFkE6w757zBQ71jPd+kKIGBZBJ+l6uhMC2x78eolqAD+CsJUeCSP2k0Uph4vEIoloA8Zkk+l9Q2JsIxtBLYi/qi/2JegGEdBK6EzqTA4hwNM0S+Ii6oK8YzHABxJaQw+sRFaf1IqAIeiZ5TW6eVuza8MGkDqIo4wUQQhp1HRI3SitG9mvnS9RFjQgwc6AAFIACUAAKQAEoAAWgABSAAlAACkABKAAFoAAUgAJQAApAASgABaAAFIACUAAKQAEoAAWgABSAAlAACkABKMC6AprIC5hjCQFEfkOJ8dYQUCQtIMYaAtJl669uYg0BT8sK2GGN+ol/oaSAKIsIIL3kzvdeTiwTC2XqPxdkHQH+MiecDyIWira7oOWXPkssFT6vwE70zG5FrBbtcl3C5RcnEitGq6TUjXv282JH1tzIGvzG679q/n6aTwGLEQAAAABJRU5ErkJggg==',
								eventTime: Date.now() + 1600,
								priority: 1
							};
							console.log( notif );
							chrome.notifications.create(
								pid, notif, function( notificationId ) { return notificationId; }
							);
							break;
						}
					}
				}
			}
		} );
	},
	run: function() {
		if ( fbgn.runSettingsChanged() ) {
			return;
		}
		fbgn._generatingToken = 0;
		var tkn = fbgn.runCheckToken();
		if ( tkn ) {
			fbgn.loopGroups( fbgn.processGrp, fbgn.grpIDs );
		}
	},


	reInit: function ( minutes ) {
		minutes = minutes > 0 ? minutes : 1;
		chrome.alarms.clearAll(
			function() {
				setTimeout(
					fbgn.init,
					minutes * 60000 // 1minute = 60,000ms
				);
			}
		);
	},
	notificationClicked: function( id ) {
		chrome.tabs.create( { url: 'http://facebook.com/' + id } );
	}
};

chrome.alarms.onAlarm.addListener( fbgn.run );
chrome.notifications.onClicked.addListener( fbgn.notificationClicked );
fbgn.init();