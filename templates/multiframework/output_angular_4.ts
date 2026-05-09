import { Component } from '@angular/core';
@Component({
    selector: 'app-home',
    template: `
    <div>
      <h1>Smile Studio</h1>
      <p>Contact: hello@smilestudio.com</p>
      <p>Smile Studio offers advanced dental solutions in a comfortable, modern environment.</p>
    </div>
  `
})
export class HomeComponent {
    title = '';
    email = '';
    description = '';
}
