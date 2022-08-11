import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HelperFunctionsService {

  constructor() { }

  static lettersOnly(event: KeyboardEvent, extended: boolean = false) {
    if (extended) return `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.;"'()`.includes(event.key);
    return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(event.key);
  }

  static noJsonSymbols(event: KeyboardEvent) {
    return !`"{}`.includes(event.key);
  }

  static createFakeArray(l:number) {
    var res = new Array(l);
    for (let x = 0; x < l; x++) {
      res[x] = x;
    }
    return res;
  }

  static toTitleCase(str: String) {
    return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

  static setCookie(cname: string, cvalue: string, exdays: number) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = 'expires='+ d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/;SameSite=Strict;';
  }

  static getCookie(name: string) {
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
  }

  static deleteCookie( name: string ) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;SameSite=Strict;';
  }
}
