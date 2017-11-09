'use strict';
const Code = require('code');
const Lab = require('lab');
const WillCall = require('../');


// Test shortcuts
const lab = exports.lab = Lab.script();
const { describe, it } = lab;
const expect = Code.expect;


describe('Will Call', () => {
  describe('WillCall.prototype.expect()', () => {
    it('stores contexts of functions passed in', () => {
      const wc = new WillCall();
      let item;

      wc.expect(() => {});
      item = wc._checks.pop();
      expect(item.expected).to.equal(1);
      expect(item.actual).to.equal(0);
      expect(item.stack).to.be.a.string();
      expect(item.name).to.equal('<anonymous>');

      wc.expect(function foo () {});
      item = wc._checks.pop();
      expect(item.expected).to.equal(1);
      expect(item.actual).to.equal(0);
      expect(item.stack).to.be.a.string();
      expect(item.name).to.equal('foo');

      wc.expect(function bar () {}, 3);
      item = wc._checks.pop();
      expect(item.expected).to.equal(3);
      expect(item.actual).to.equal(0);
      expect(item.stack).to.be.a.string();
      expect(item.name).to.equal('bar');
    });

    it('invoking wrapped function increments actual count', () => {
      const wc = new WillCall();
      const foo = wc.expect(function foo () { return 'bar'; });
      const item = wc._checks[wc._checks.length - 1];

      expect(item.actual).to.equal(0);
      expect(foo()).to.equal('bar');
      expect(item.actual).to.equal(1);
    });

    it('sets expected to 1 if an invalid value is passed', () => {
      function test (value) {
        const wc = new WillCall();
        wc.expect(function foo () { return 'bar'; }, value);
        expect(wc._checks.pop().expected).to.equal(1);
      }

      test(undefined);
      test(null);
      test('');
      test('3');
      test(-1);
      test(3.14);
      test(Infinity);
      test(NaN);
      test(true);
      test(false);
      test(/foo/);
      test([]);
      test({});
    });

    it('throws if fn is not a function', () => {
      function fail (fn) {
        const wc = new WillCall();

        expect(() => { wc.expect(fn); }).to.throw(TypeError, 'fn must be a function');
      }

      fail(undefined);
      fail(null);
      fail('');
      fail('foo');
      fail(0);
      fail(1);
      fail(Infinity);
      fail(NaN);
      fail(true);
      fail(false);
      fail(/foo/);
      fail([]);
      fail({});
    });
  });

  describe('WillCall.prototype.check()', () => {
    it('reports functions that were not called appropriately', () => {
      const wc = new WillCall();
      const foo = wc.expect(function foo () { return 'foo'; });
      const bar = wc.expect(function bar () { return 'bar'; }, 2);
      const baz = wc.expect(function baz () { return 'baz'; });

      foo();
      bar();
      baz();
      baz();

      const results = wc.check();

      expect(results).to.be.an.array();
      expect(results.length).to.equal(2);
      expect(results[0].name).to.equal('bar');
      expect(results[0].expected).to.equal(2);
      expect(results[0].actual).to.equal(1);
      expect(results[0].stack).to.be.a.string();
      expect(results[1].name).to.equal('baz');
      expect(results[1].expected).to.equal(1);
      expect(results[1].actual).to.equal(2);
      expect(results[1].stack).to.be.a.string();
    });
  });

  it('works with async functions', async () => {
    let sleepCount = 0;

    function sleep (ms) {
      return new Promise((resolve) => {
        setTimeout(() => {
          sleepCount++;
          resolve();
        }, ms);
      });
    }

    const wc = new WillCall();
    const foo = wc.expect(async function foo () {
      await sleep(1500);
      return 'foo';
    });
    const bar = wc.expect(async function bar () {
      await sleep(1000);
      return 'bar';
    }, 2);
    const baz = wc.expect(async function baz () { // eslint-disable-line require-await
      return sleep(1000);
    });

    await foo();
    await bar();
    await baz();
    await baz();
    expect(sleepCount).to.equal(4);

    const results = wc.check();

    expect(results).to.be.an.array();
    expect(results.length).to.equal(2);
    expect(results[0].name).to.equal('bar');
    expect(results[0].expected).to.equal(2);
    expect(results[0].actual).to.equal(1);
    expect(results[0].stack).to.be.a.string();
    expect(results[1].name).to.equal('baz');
    expect(results[1].expected).to.equal(1);
    expect(results[1].actual).to.equal(2);
    expect(results[1].stack).to.be.a.string();
  });
});
