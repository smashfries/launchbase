import * as dotenv from 'dotenv';
dotenv.config({path: './.env'});

export const jsPath = function(path) {
  if (process.env.PROD == true) {
    return `${path}.min`;
  } else {
    return path;
  }
};
