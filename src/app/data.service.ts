import {Injectable, isDevMode, ApplicationRef} from '@angular/core';
import {Observable} from "rxjs";
import {Settings} from "./settings";
import {forEach} from "@angular/router/src/utils/collection";

@Injectable()
export class DataService {

	loading: boolean = true;
	token: string = '';
	keywords: string = '';
	settings: Settings = {
		keywords: '',
		group1: '',
		group2: '',
		group3: '',
		group4: '',
		group5: '',
	};

	constructor( private appRef: ApplicationRef ) {
		this.init();
	}

	private init() {
		//let self = this;

		this.get(
			['access_token', 'keywords', 'group1', 'group2', 'group3', 'group4', 'group5'],
		).subscribe( ( data: any ) => {
				this.loading = false;
				if ( ! this.token ) {
					if ( data.access_token ) {
						this.token = data.access_token;
					}
				}
				delete data.access_token;
				this.settings = data;
			}
		);

		this.set( {token_url: 'https://www.facebook.com/dialog/oauth?client_id=409069776123517&response_type=token&redirect_uri=http://nick.iex.uno%3Fchrome_extension'} );
	}


	set( data:any, callback?:()=>void ) {
		if ( ! callback ) callback = ()=>{};
		if ( chrome.storage && chrome.storage.local ) {
			chrome.storage.local.set( data, callback );
		} else {
			for( let key in data) {
				window.localStorage.setItem( key, data[ key ] );
			}
			callback();
		}
	}

	get( keys:string|string[] ): Observable<any> {
		if ( typeof keys == 'string' ) { // make sure key is string
			keys = [ keys ];
		}
		return new Observable( obs => {
			if ( chrome.storage && chrome.storage.local ) {
				chrome.storage.local.get( keys, data => {
					obs.next( data );
					this.appRef.tick();
					obs.complete();
				} );
			} else {
				let data:any = {};
				for ( let i = 0; i < keys.length; i++ ) {
					data[ keys[i] ] = window.localStorage.getItem( keys[i] );
					obs.next( data );
					this.appRef.tick();
					obs.complete();
				}
			}
		} );
	}

	syncSettings( callback?:()=>{} ) {
		this.settings.settingsChanged = 1;
		if ( callback ) {
			this.set( this.settings, callback )
		} else {
			this.set( this.settings )
		}
	};
}
