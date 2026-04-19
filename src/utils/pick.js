const pick = (source, keys) =>
  keys.reduce((accumulator, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      accumulator[key] = source[key];
    }

    return accumulator;
  }, {});

export default pick;
