import { Component } from '@angular/core';

import { IncidentList } from './incidents/incident-list';

@Component({
  selector: 'app-root',
  imports: [IncidentList],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
