import { Component } from '@angular/core';
@Component({
    selector: 'app-home',
    template: `
    <div>
      <h1>Bright Smiles Clinic</h1>
      <p>Contact: contact@brightsmiles.com</p>
      <p>Bright Smiles Clinic specializes in cosmetic and family dentistry for all ages.</p>
    </div>
  `
})
export class HomeComponent {
    title = '';
    email = '';
    description = '';
}
