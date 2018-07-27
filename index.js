const share = source => {
  let sinks = [];
  let sourceTalkback;

  return function shared(start, sink) {
    if (start !== 0) return;
    sinks.push(sink);

    const talkback = (t, d) => {
      if (t === 2) {
        const i = sinks.indexOf(sink);
        if (i > -1) sinks.splice(i, 1);
        if (!sinks.length) sourceTalkback(2);
      } else {
        sourceTalkback(t, d);
      }
    };

    if (sinks.length === 1) {
      source(0, (t, d) => {
        if (t === 0) {
          sourceTalkback = d;
          sink(0, talkback);
        } else for (let s of sinks.slice(0)) s(t, d);
        if (t === 2) sinks = [];
      });
      return
    }

    sink(0, talkback);
  }
};

export default share;
