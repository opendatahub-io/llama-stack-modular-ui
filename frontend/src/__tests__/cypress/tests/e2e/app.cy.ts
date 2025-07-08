import { checkAppLoaded, visitApp, waitForPageLoad } from '../../support/commands/common';

describe('App Tests', () => {
  beforeEach(() => {
    visitApp();
    waitForPageLoad();
  });

  it('Loads app successfully', () => {
    checkAppLoaded();
  });
});
