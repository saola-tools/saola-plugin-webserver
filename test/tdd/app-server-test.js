'use strict';

const app = require('../../app');

describe('app-webserver', function() {
  describe('start/stop app.server', function() {
    it('app.server should be started/stopped properly', function(done) {
      app.server.start().then(function() {
        return app.server.stop();
      }).then(function() {
        done();
      });
      this.timeout(6000);
    });
  });
});
