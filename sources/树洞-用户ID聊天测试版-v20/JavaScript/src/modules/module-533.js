// Recovered module 533; analysis path, not original filename.
// Original SHA-256 2eefa58869ab840df1487e43bf9388c4dd423e059e8c17be23c965c8870c57be; original byte range [713530, 713751).
__d(533, function (c, e, r, l) {
  function n(c, e, r) {
    switch (r.length) {
      case 0:
        return c.call(e);
      case 1:
        return c.call(e, r[0]);
      case 2:
        return c.call(e, r[0], r[1]);
      case 3:
        return c.call(e, r[0], r[1], r[2]);
    }
    return c.apply(e, r);
  }
  r.exports = n;
});
