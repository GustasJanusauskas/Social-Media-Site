import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { AnonymousSubject } from 'rxjs/internal/Subject';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';

import { Chat } from '../interfaces/chat';
import { MessageSend } from '../interfaces/message';
import { VERBOSE_DEBUG } from '../app.component';

const MSG_URL = "ws://localhost:4001";

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private subject!: AnonymousSubject<MessageEvent>;
  public messages: Subject<MessageSend>;

  constructor() {
      this.messages = <Subject<MessageSend>>this.connect(MSG_URL).pipe(
          map(
              (response: MessageEvent): MessageSend => {
                if (VERBOSE_DEBUG) console.log(response.data);
                  let data = JSON.parse(response.data)
                  return data;
              }
          )
      );
  }

  public connect(url: string): AnonymousSubject<MessageEvent> {
      if (!this.subject) {
          this.subject = this.create(url);
          if (VERBOSE_DEBUG) console.log("Successfully connected: " + url);
      }
      return this.subject;
  }

  private create(url: string): AnonymousSubject<MessageEvent> {
    let ws = new WebSocket(url);
    let observable = new Observable((obs: Observer<MessageEvent>) => {
        ws.onmessage = obs.next.bind(obs);
        ws.onerror = obs.error.bind(obs);
        ws.onclose = obs.complete.bind(obs);
        return ws.close.bind(ws);
    });
    let observer = {
        error: () => {},
        complete: () => {},
        next: (data: Object) => {
          if (VERBOSE_DEBUG) console.log('Message sent to websocket: ', data);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(data));
            }
        }
    };
    return new AnonymousSubject<MessageEvent>(observer, observable);
}
}