const read = require('../../../utils/read-file')

module.exports = {
  up: (pgm) => pgm.sql(read(__dirname + '/sql/up.sql')),
  down: (pgm) => pgm.sql(read(__dirname + '/sql/down.sql')),
}
