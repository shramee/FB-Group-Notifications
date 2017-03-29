import { NfbgnPage } from './app.po';

describe('nfbgn App', () => {
  let page: NfbgnPage;

  beforeEach(() => {
    page = new NfbgnPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
