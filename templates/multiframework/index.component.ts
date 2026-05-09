import { Component } from '@angular/core';
@Component({
    selector: 'app-home',
    template: `
    <div>
      <h1>{{ title }}</h1>
      <p>Contact: {{ email }}</p>
      <p>{{ description }}</p>
    </div>
  `
})
export class HomeComponent {
    title = '';
    email = '';
    description = '';
}
