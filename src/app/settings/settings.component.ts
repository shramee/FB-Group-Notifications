import { Component, OnInit } from '@angular/core';
import {DataService} from "../data.service";

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  constructor( public data:DataService ) { }

  ngOnInit() {
  }

  save() {
    this.data.set( { settingsChanged: 1 } );
    this.data.syncSettings();
  }

  reset() {
    if ( ! confirm( 'Are you sure you want to reset all settings? \n You will have to login again.' ) ) {
      return;
    }
    this.data.set( { settingsChanged: 1 } );
    this.data.settings = {
      keywords: '',
      group1: '',
      group2: '',
      group3: '',
      group4: '',
      group5: '',
    };
    this.data.syncSettings();
  }
}
