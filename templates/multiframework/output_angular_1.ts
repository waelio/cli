import { Component } from '@angular/core';
@Component({
    selector: 'app-home',
    template: `
    <div>
      <h1>Acme Dental</h1>
      <p>Contact: info@acmedental.com</p>
      <p>Acme Dental provides top-quality dental care with a friendly team and modern technology.</p>
    </div>
  `
})
export class HomeComponent {
    title = '';
    email = '';
    description = '';
}
