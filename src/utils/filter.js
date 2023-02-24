import Filter from 'bad-words';
const filter = new Filter();

export const isProfane = function(text) {
  return filter.isProfane(text);
};
