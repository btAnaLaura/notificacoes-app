import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

import { AppComponent } from './app/app.component';

const config: SocketIoConfig = { url: 'ws://localhost:8080', options: {} };

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      FormsModule,
      SocketIoModule.forRoot(config)  
    ),
    provideHttpClient(),
  ],
}).catch(err => console.error(err));
