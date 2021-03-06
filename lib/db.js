/*
 This file just manages the database connection and provides a query method
 */

import pg from 'pg';
// or native libpq bindings
// import pg from 'pg/native';

export default (connection_string, log = console.error) => {
  const client = new pg.Client(connection_string);
  let client_active = false;
  const beforeCloseListeners = [];

  const createConnection = () =>
    new Promise((resolve, reject) => (
      client_active
        ? resolve()
        : client.connect((err) => {
          if (err) {
            log('could not connect to postgres', err);
            reject(err);
          } else {
            client_active = true;
            resolve();
          }
        })
    ));

  const query = string =>
    createConnection()
      .then(() =>
        new Promise((resolve, reject) =>
          client.query(string, (err, result) => (
            err
              ? reject(err)
              : resolve(result)
          ))
        )
      )
      .catch((err) => {
        const { message, position } = err;
        if (message && position >= 1) {
          const endLineWrapIndexOf = string.indexOf('\n', position);
          const endLineWrapPos = endLineWrapIndexOf >= 0 ? endLineWrapIndexOf : string.length;
          const stringStart = string.substring(0, endLineWrapPos);
          const stringEnd = string.substr(endLineWrapPos);
          const startLineWrapPos = stringStart.lastIndexOf('\n') + 1;
          const padding = ' '.repeat(position - startLineWrapPos - 1);
          log(`Error executing:
${stringStart}
${padding}^^^^${stringEnd}

${message}
`);
        } else {
          log(`Error executing:
${string}
${err}
`);
        }
        throw err;
      });

  const select = string =>
    query(string)
      .then(result => result && result.rows);
  const column = (string, column_name) =>
    select(string)
      .then(rows => rows.map(r => r[column_name]));

  return {
    query,
    select,
    column,

    addBeforeCloseListener: listener => beforeCloseListeners.push(listener),

    close: () =>
      beforeCloseListeners
        .reduce(
          (promise, listener) =>
            promise
              .then(listener)
              .catch(err =>
                log(err.stack || err)
              ),
          Promise.resolve()
        )
        .then(() => {
          client_active = false;
          if (client) {
            client.end();
          }
        }),
  };
};
