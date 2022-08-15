import { Component, OnInit, Input } from '@angular/core';

import { AppComponent } from '../app.component';

import { HelperFunctionsService } from "../services/helper-functions.service";
import { UserdataService } from "../services/userdata.service";

import { UserInfo } from "../interfaces/userinfo";

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.css']
})
export class EditProfileComponent implements OnInit {
  @Input() userinfo!: UserInfo;
  @Input() rootComponent!: AppComponent;

  profileDescCharLeft : number = 1024;
  profilePic: File = File.prototype;
  updateProfileEnabled: boolean = true;

  formError: string = "";

  //Imported helper functions
  lettersOnly = HelperFunctionsService.lettersOnly;

  constructor(private userdataService: UserdataService) { 

  }

  ngOnInit(): void {

  }

  updateCharCounter() {
    if (this.userinfo.profileDesc) this.profileDescCharLeft = 1024 - this.userinfo.profileDesc?.length;
  }

  updateProfile() {
    if (!this.userinfo.firstName || !this.userinfo.lastName || this.userinfo.firstName?.trim().length == 0 || this.userinfo.lastName?.trim().length == 0) {
      this.formError = 'Profile must have both a first and last name set.';
      return;
    }

    if (this.profilePic != File.prototype && this.profilePic.size > 8.192 * 1000 * 1000) {
      this.formError = 'Profile picture size must be under 8 megabytes.';
      return;
    }

    var session = HelperFunctionsService.getCookie('session');
    if (session == null || session.length < 64 ) {
      this.formError = 'Must be logged in to update profile.';
      return;
    }

    this.formError = 'Updating profile..';
    this.userdataService.updateProfile(session,this.userinfo).subscribe(data => {
      if (data.success) {
        this.formError = 'Profile updated!';
      }
      else {
        this.formError = 'Failed to update profile, please try again later.';
      }
    });
  }

  onAvatarChange(event: Event) {
    const target = event.target as HTMLInputElement;

    if (target.files) {
      this.profilePic = target.files[0];
      this.updateProfileEnabled = false;

      const reader = new FileReader();
      reader.readAsDataURL(this.profilePic);
      reader.onload = () => {
        this.userinfo.avatar = reader.result?.toString().substring(reader.result?.toString().indexOf(',') + 1);
        this.userinfo.avatarPath = this.profilePic.name;

        this.updateProfileEnabled = true;
      }
    }
  }
}