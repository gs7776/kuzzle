var
  should = require('should'),
  q = require('q'),
  winston = require('winston'),
  params = require('rc')('kuzzle'),
  Kuzzle = require.main.require('lib/api/Kuzzle'),
  BadRequestError = require.main.require('lib/api/core/errors/badRequestError'),
  RequestObject = require.main.require('lib/api/core/models/requestObject'),
  ResponseObject = require.main.require('lib/api/core/models/responseObject'),
  Profile = require.main.require('lib/api/core/models/security/profile'),
  Role = require.main.require('lib/api/core/models/security/role');

require('should-promised');

/*
 * Since we're querying the database for non-existent documents, we expect
 * most of these calls, if not all, to return a rejected promise.
 */
describe('Test: read controller', function () {
  var
    kuzzle;

  before(function () {
    kuzzle = new Kuzzle();
    kuzzle.log = new (winston.Logger)({transports: [new (winston.transports.Console)({level: 'silent'})]});
    return kuzzle.start(params, {dummy: true});
  });

  describe('#search', function () {
    it('should allow to perform searches', function () {
      var
        requestObject = new RequestObject({}, {collection: 'unit-test-readcontroller'}, 'unit-test'),
        r = kuzzle.funnel.read.search(requestObject);

      return should(r).be.rejectedWith(Error, { status: 400 });
    });

    it('should trigger a plugin event', function (done) {
      var requestObject = new RequestObject({}, {collection: 'unit-test-readcontroller'}, 'unit-test');

      this.timeout(50);
      kuzzle.on('data:search', () => done());
      kuzzle.funnel.read.search(requestObject);
    });
  });

  describe('#get', function () {
    it('should allow to get specific documents', function () {
      var
        requestObject = new RequestObject({body: {_id: 'foobar'}}, {collection: 'unit-test-readcontroller'}, 'unit-test'),
        r = kuzzle.funnel.read.get(requestObject);

      return should(r).be.rejectedWith(Error, {status: 404});
    });

    it('should trigger a plugin event', function (done) {
      var requestObject = new RequestObject({ body: { _id: 'foobar' }}, { collection: 'unit-test-readcontroller' }, 'unit-test');

      this.timeout(50);
      kuzzle.on('data:get', () => done());
      kuzzle.funnel.read.get(requestObject);
    });
  });

  describe('#count', function () {
    it('should allow to count documents', function () {
      var
        requestObject = new RequestObject({}, {collection: 'unit-test-readcontroller'}, 'unit-test'),
        r = kuzzle.funnel.read.count(requestObject);

      return should(r).be.rejectedWith(Error, {status: 400});
    });

    it('should trigger a plugin event', function (done) {
      var requestObject = new RequestObject({}, {collection: 'unit-test-readcontroller'}, 'unit-test');

      this.timeout(50);
      kuzzle.on('data:count', () => done());
      kuzzle.funnel.read.count(requestObject);
    });
  });

  describe('#listCollections', function () {
    var
      realtime,
      stored,
      context = {
        connection: {id: 'connectionid'},
        user: null
      };

    before(function () {
      kuzzle.services.list.readEngine.listCollections = function(requestObject) {
        stored = true;
        return q(new ResponseObject(requestObject, {collections: {stored: ['foo']}}));
      };

      kuzzle.hotelClerk.getRealtimeCollections = function () {
        realtime = true;
        return ['foo', 'bar'];
      };

      kuzzle.repositories.role.roles.guest = new Role();

      return kuzzle.repositories.role.hydrate(kuzzle.repositories.role.roles.guest, params.userRoles.guest)
        .then(() => {
          kuzzle.repositories.profile.profiles.anonymous = new Profile();
          return kuzzle.repositories.profile.hydrate(kuzzle.repositories.profile.profiles.anonymous, params.userProfiles.anonymous);
        })
        .then(() => {
          return kuzzle.repositories.user.anonymous();
        })
        .then(user => {
          context.user = user;
        });
    });

    beforeEach(function () {
      realtime = false;
      stored = false;
    });

    it('should resolve to a full collections list', function (done) {
      var
        requestObject = new RequestObject({}, {}, ''),
        r = kuzzle.funnel.read.listCollections(requestObject, context);

      should(r).be.a.Promise();

      r
        .then(result => {
          should(realtime).be.true();
          should(stored).be.true();
          should(result.data.type).be.exactly('all');
          should(result.data.collections).not.be.undefined().and.be.an.Object();
          should(result.data.collections.stored).not.be.undefined().and.be.an.Array();
          should(result.data.collections.realtime).not.be.undefined().and.be.an.Array();
          should(result.data.collections.stored.sort()).match(['foo']);
          should(result.data.collections.realtime.sort()).match(['bar', 'foo']);
          done();
        })
        .catch(error => done(error));
    });

    it('should trigger a plugin event', function (done) {
      var requestObject = new RequestObject({}, {}, '');

      this.timeout(50);
      kuzzle.once('data:listCollections', () => done());
      kuzzle.funnel.read.listCollections(requestObject, context);
    });

    it('should reject the request if an invalid "type" argument is provided', function () {
      var requestObject = new RequestObject({body: {type: 'foo'}}, {}, '');

      return should(kuzzle.funnel.read.listCollections(requestObject, context)).be.rejectedWith(BadRequestError);
    });

    it('should only return stored collections with type = stored', function () {
      var requestObject = new RequestObject({body: {type: 'stored'}}, {}, '');

      return kuzzle.funnel.read.listCollections(requestObject, context).then(response => {
        should(response.data.type).be.exactly('stored');
        should(realtime).be.false();
        should(stored).be.true();
      });
    });

    it('should only return realtime collections with type = realtime', function () {
      var requestObject = new RequestObject({body: {type: 'realtime'}}, {}, '');

      return kuzzle.funnel.read.listCollections(requestObject, context).then(response => {
        should(response.data.type).be.exactly('realtime');
        should(realtime).be.true();
        should(stored).be.false();
      });
    });
  });

  describe('#now', function () {
    it('should resolve to the current timestamp', function () {
      var
        requestObject = new RequestObject({}, {}, ''),
        result = kuzzle.funnel.read.now(requestObject);

      should(result).be.a.Promise();

      return result.then(result => {
        should(result.data).not.be.undefined();
        should(result.data.now).not.be.undefined().and.be.a.Number();
      });
    });

    it('should trigger a plugin event', function (done) {
      var requestObject = new RequestObject({}, {}, '');

      this.timeout(50);
      kuzzle.on('data:now', () => done());
      kuzzle.funnel.read.now(requestObject);
    });
  });
});
