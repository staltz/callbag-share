const test = require('tape');
const share = require('.');

test('it shares an async finite listenable source', t => {
  t.plan(26);
  const upwardsExpected = [[0, 'function']];

  const downwardsExpectedTypeA = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'number'],
    [2, 'undefined'],
  ];
  const downwardsExpectedA = [10, 20, 30];

  const downwardsExpectedTypeB = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [2, 'undefined'],
  ];
  const downwardsExpectedB = [20, 30];

  function makeSource() {
    let sent = 0;
    const source = (type, data) => {
      const e = upwardsExpected.shift();
      t.equals(type, e[0], 'upwards type is expected: ' + e[0]);
      t.equals(typeof data, e[1], 'upwards data is expected: ' + e[1]);
      if (type === 0) {
        const sink = data;
        const id = setInterval(() => {
          if (sent === 0) {
            sent++;
            sink(1, 10);
            return;
          }
          if (sent === 1) {
            sent++;
            sink(1, 20);
            return;
          }
          if (sent === 2) {
            sent++;
            sink(1, 30);
            return;
          }
          if (sent === 3) {
            sink(2);
            clearInterval(id);
            return;
          }
        }, 100);
        sink(0, source);
      }
    };
    return source;
  }

  function sinkA(type, data) {
    const et = downwardsExpectedTypeA.shift();
    t.equals(type, et[0], 'downwards A type is expected: ' + et[0]);
    t.equals(typeof data, et[1], 'downwards A data type is expected: ' + et[1]);
    if (type === 1) {
      const e = downwardsExpectedA.shift();
      t.equals(data, e, 'downwards A data is expected: ' + e);
    }
  }

  function sinkB(type, data) {
    const et = downwardsExpectedTypeB.shift();
    t.equals(type, et[0], 'downwards B type is expected: ' + et[0]);
    t.equals(typeof data, et[1], 'downwards B data type is expected: ' + et[1]);
    if (type === 1) {
      const e = downwardsExpectedB.shift();
      t.equals(data, e, 'downwards B data is expected: ' + e);
    }
  }

  const source = share(makeSource());
  source(0, sinkA);
  setTimeout(() => {
    source(0, sinkB);
  }, 150);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 700);
});

test('it shares a pullable source', t => {
  t.plan(35);
  const upwardsExpected = [
    [0, 'function'],
    [1, 'undefined'],
    [1, 'undefined'],
    [1, 'undefined'],
    [1, 'undefined'],
  ];

  const downwardsExpectedTypeA = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'number'],
    [2, 'undefined'],
  ];
  const downwardsExpectedA = [10, 20, 30];

  const downwardsExpectedTypeB = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'number'],
    [2, 'undefined'],
  ];
  const downwardsExpectedB = [10, 20, 30];

  function makeSource() {
    let _sink;
    let sent = 0;
    const source = (type, data) => {
      t.true(upwardsExpected.length > 0, 'source can be pulled');
      const e = upwardsExpected.shift();
      t.equals(type, e[0], 'upwards type is expected: ' + e[0]);
      t.equals(typeof data, e[1], 'upwards data is expected: ' + e[1]);

      if (type === 0) {
        _sink = data;
        _sink(0, source);
        return;
      }
      if (sent === 3) {
        _sink(2);
        return;
      }
      if (sent === 0) {
        sent++;
        _sink(1, 10);
        return;
      }
      if (sent === 1) {
        sent++;
        _sink(1, 20);
        return;
      }
      if (sent === 2) {
        sent++;
        _sink(1, 30);
        return;
      }
    };
    return source;
  }

  function makeSinkA() {
    let talkback;
    return (type, data) => {
      const et = downwardsExpectedTypeA.shift();
      t.equals(type, et[0], 'downwards A type is expected: ' + et[0]);
      t.equals(typeof data, et[1], 'downwards A data type is expected: ' + et[1]);
      if (type === 0) {
        talkback = data;
        setTimeout(() => talkback(1));
      }
      if (type === 1) {
        const e = downwardsExpectedA.shift();
        t.equals(data, e, 'downwards A data is expected: ' + e);
        if (data === 20) setTimeout(() => talkback(1));
      }
    };
  }

  function makeSinkB() {
    let talkback;
    return (type, data) => {
      const et = downwardsExpectedTypeB.shift();
      t.equals(type, et[0], 'downwards B type is expected: ' + et[0]);
      t.equals(typeof data, et[1], 'downwards B data type is expected: ' + et[1]);
      if (type === 0) {
        talkback = data;
      }
      if (type === 1) {
        const e = downwardsExpectedB.shift();
        t.equals(data, e, 'downwards B data is expected: ' + e);
        if (data === 10) setTimeout(() => talkback(1));
      }
    };
  }

  const source = share(makeSource());
  const sinkA = makeSinkA();
  const sinkB = makeSinkB();
  source(0, sinkA);
  source(0, sinkB);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 500);
});

test('it disposes only when last sink sends upwards END', t => {
  t.plan(27);
  const upwardsExpected = [[0, 'function'], [2, 'undefined']];

  const downwardsExpectedTypeA = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
  ];
  const downwardsExpectedA = [10, 20];

  const downwardsExpectedTypeB = [
    [0, 'function'],
    [1, 'number'],
    [1, 'number'],
    [1, 'number'],
    [1, 'number'],
  ];
  const downwardsExpectedB = [10, 20, 30, 40];

  function makeSource() {
    let sent = 0;
    let id;
    const source = (type, data) => {
      const e = upwardsExpected.shift();
      t.equals(type, e[0], 'upwards type is expected: ' + e[0]);
      t.equals(typeof data, e[1], 'upwards data is expected: ' + e[1]);
      if (type === 0) {
        const sink = data;
        id = setInterval(() => {
          sink(1, ++sent * 10);
        }, 100);
        sink(0, source);
      } else if (type === 2) {
        clearInterval(id);
      }
    };
    return source;
  }

  function makeSinkA(type, data) {
    let talkback;
    return (type, data) => {
      const et = downwardsExpectedTypeA.shift();
      t.equals(type, et[0], 'downwards A type is expected: ' + et[0]);
      t.equals(typeof data, et[1], 'downwards A data type is expected: ' + et[1]);
      if (type === 0) {
        talkback = data;
      }
      if (type === 1) {
        const e = downwardsExpectedA.shift();
        t.equals(data, e, 'downwards A data is expected: ' + e);
      }
      if (downwardsExpectedA.length === 0) {
        talkback(2);
      }
    };
  }

  function makeSinkB(type, data) {
    let talkback;
    return (type, data) => {
      const et = downwardsExpectedTypeB.shift();
      t.equals(type, et[0], 'downwards B type is expected: ' + et[0]);
      t.equals(typeof data, et[1], 'downwards B data type is expected: ' + et[1]);
      if (type === 0) {
        talkback = data;
      }
      if (type === 1) {
        const e = downwardsExpectedB.shift();
        t.equals(data, e, 'downwards B data is expected: ' + e);
      }
      if (downwardsExpectedB.length === 0) {
        talkback(2);
      }
    };
  }

  const source = share(makeSource());
  const sinkA = makeSinkA();
  const sinkB = makeSinkB();
  source(0, sinkA);
  source(0, sinkB);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 900);
});

test('it can share a sync finite listenable source', t => {
  t.plan(10);
  const upwardsExpected = [[0, 'function']];

  const downwardsExpectedTypeA = [
    [0, 'function'],
    [1, 'string'],
    [2, 'undefined'],
  ];
  const downwardsExpectedA = ['hi'];

  function makeSource() {
    const source = (type, data) => {
      const e = upwardsExpected.shift();
      t.equals(type, e[0], 'upwards type is expected: ' + e[0]);
      t.equals(typeof data, e[1], 'upwards data is expected: ' + e[1]);
      if (type === 0) {
        const sink = data;
        sink(0, source);
        sink(1, 'hi');
        sink(2);
      }
    };
    return source;
  }

  function sinkA(type, data) {
    const et = downwardsExpectedTypeA.shift();
    t.equals(type, et[0], 'downwards A type is expected: ' + et[0]);
    t.equals(typeof data, et[1], 'downwards A data type is expected: ' + et[1]);
    if (type === 1) {
      const e = downwardsExpectedA.shift();
      t.equals(data, e, 'downwards A data is expected: ' + e);
    }
  }

  const source = share(makeSource());
  source(0, sinkA);

  setTimeout(() => {
    t.pass('nothing else happens');
    t.end();
  }, 700);
});

test('it can share for synchronously requesting sink', t => {
  t.plan(7);

  const upwardsExpectedType = [
    [0, 'function'],
    [1, 'undefined'],
  ];

  const downwardsExpectedType = [
    [0, 'function'],
  ];

  function makeSource() {
    const source = (type, data) => {
      const et = upwardsExpectedType.shift();
      t.equals(type, et[0], 'upwards type is expected: ' + et[0]);
      t.equals(typeof data, et[1], 'upwards data type is expected: ' + et[1]);

      if (type !== 0) return;
      const sink = data;
      sink(0, source);
    };
    return source;
  }

  function makeSink() {
    let talkback;
    return (type, data) => {
      const et = downwardsExpectedType.shift();
      t.equals(type, et[0], 'downwards type is expected: ' + et[0]);
      t.equals(typeof data, et[1], 'downwards data type is expected: ' + et[1]);

      if (type === 0) talkback = data;
      if (type === 1 || type === 0) talkback(1);
    };
  }

  const source = share(makeSource());

  source(0, makeSink());

  t.pass('did not crash');
  t.end();
});
