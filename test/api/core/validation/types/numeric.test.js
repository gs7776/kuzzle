const
  PreconditionError = require('kuzzle-common-objects').errors.PreconditionError,
  BaseType = require('../../../../../lib/api/core/validation/baseType'),
  NumericType = require('../../../../../lib/api/core/validation/types/numeric'),
  should = require('should');

describe('Test: validation/types/numeric', () => {
  const numericType = new NumericType();

  it('should inherit the BaseType class', () => {
    should(numericType).be.instanceOf(BaseType);
  });

  it('should construct properly', () => {
    should(typeof numericType.typeName).be.eql('string');
    should(typeof numericType.allowChildren).be.eql('boolean');
    should(Array.isArray(numericType.allowedTypeOptions)).be.true();
    should(numericType.typeName).be.eql('numeric');
    should(numericType.allowChildren).be.false();
  });

  describe('#validate', () => {
    const
      emptyTypeOptions = {},
      rangeTypeOptions = {
        range: {
          min: 41,
          max: 42
        }
      };

    it('should return true if fieldValue is valid', () => {
      should(numericType.validate(emptyTypeOptions, 25.25, [])).be.true();
    });

    it('should return true if fieldValue is valid and in range', () => {
      should(numericType.validate(rangeTypeOptions, 41.5, [])).be.true();
    });

    it('should return false if fieldValue is not a number', () => {
      const errorMessages = [];

      should(numericType.validate(emptyTypeOptions, 'a string', errorMessages)).be.false();
      should(errorMessages).be.deepEqual(['The field must be a number.']);
    });

    it('should return false if fieldValue is below min', () => {
      const errorMessages = [];

      should(numericType.validate(rangeTypeOptions, 40.1, errorMessages)).be.false();
      should(errorMessages).be.deepEqual(['The value is lesser than the minimum.']);
    });

    it('should return false if fieldValue is above max', () => {
      const errorMessages = [];

      should(numericType.validate(rangeTypeOptions, 43.1, errorMessages)).be.false();
      should(errorMessages).be.deepEqual(['The value is greater than the maximum.']);
    });
  });

  describe('#validateFieldSpecification', () => {
    it('should validate if set properly', () => {
      const opts = {
        range: {
          min: 41,
          max: 42
        }
      };

      should(numericType.validateFieldSpecification(opts)).be.eql(opts);
    });

    it('should throw if "range" is not an object', () => {
      [[], undefined, null, 'foobar', 123].forEach(range => {
        should(() => numericType.validateFieldSpecification({range}))
          .throw(PreconditionError, {message: 'Invalid "range" option definition'});
      });
    });

    it('should throw if an unrecognized property is passed to the range options', () => {
      should(() => numericType.validateFieldSpecification({range: {foo: 123}}))
        .throw(PreconditionError, {message: 'Invalid "range" option definition'});
    });

    it('should throw if a non-numeric value is passed to the min or max properties', () => {
      [[], {}, undefined, null, 'foo'].forEach(v => {
        should(() => numericType.validateFieldSpecification({range: {min: v}}))
          .throw(PreconditionError, {message: 'Invalid "range.min" option: must be of type "number"'});

        should(() => numericType.validateFieldSpecification({range: {max: v}}))
          .throw(PreconditionError, {message: 'Invalid "range.max" option: must be of type "number"'});
      });
    });

    it('should throw if min is greater than max', () => {
      should(() => numericType.validateFieldSpecification({
        range: {
          min: 42,
          max: 41
        }
      })).throw(PreconditionError, {message: 'Invalid range: min > max'});
    });
  });
});
