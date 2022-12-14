import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from "@angular/router";

import { AppComponent } from './app.component';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatIconModule } from "@angular/material/icon";
import {MatSidenavModule} from '@angular/material/sidenav';

import { CommentsComponent } from './comments/comments.component';
import { PostComponent } from './post/post.component';
import { ProfileComponent } from './profile/profile.component';
import { EditProfileComponent } from './edit-profile/edit-profile.component';
import { NewPostComponent } from './new-post/new-post.component';
import { FriendsComponent } from './friends/friends.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@NgModule({
  declarations: [
    AppComponent,
    CommentsComponent,
    PostComponent,
    ProfileComponent,
    EditProfileComponent,
    NewPostComponent,
    FriendsComponent,
    RegisterComponent,
    LoginComponent,
    SidebarComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    BrowserAnimationsModule,
    RouterModule.forRoot([{path: 'app',component: AppComponent}]),
    MatAutocompleteModule,
    MatPaginatorModule,
    MatTabsModule,
    MatMenuModule,
    MatCardModule,
    MatDividerModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatSidenavModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
