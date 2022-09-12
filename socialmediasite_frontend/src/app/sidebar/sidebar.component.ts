import { Component, OnInit, Input } from '@angular/core';

import { AppComponent } from '../app.component';

import { UserInfo } from '../interfaces/userinfo';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  @Input() userinfo!: UserInfo;
  @Input() rootComponent!: AppComponent;

  constructor() {

  }

  ngOnInit(): void {

  }

}