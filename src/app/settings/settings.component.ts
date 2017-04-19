import {Component, OnInit} from '@angular/core';
import {DataService} from "../data.service";

@Component( {
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss']
} )
export class SettingsComponent implements OnInit {
	notice: string;
	confirmReset: boolean = false;

	constructor( public data: DataService ) {
	}

	ngOnInit() {
	}

	showNotice( notice:string ) {
		let t = this;
		t.notice = notice;
		this.data.refresh();
		setTimeout( function () {
			t.notice = '';
			this.data.refresh();
		}, 2500 );
	}

	save() {
		this.data.set( {settingsChanged: 1} );
		this.data.syncSettings( () => {
			this.showNotice( '&#x2714; Settings Saved' );
		} );
	}

	switchConfirmReset() {
		this.confirmReset = true;
		this.data.refresh();
	}
	reset() {
		this.confirmReset = false;
		this.data.set( {settingsChanged: 1} );
		this.data.settings = {
			keywords: '',
			group1: '',
			group2: '',
			group3: '',
			group4: '',
			group5: '',
		};
		this.data.syncSettings();
		this.showNotice( '&#x2714; Settings Reset' );
	}
}
