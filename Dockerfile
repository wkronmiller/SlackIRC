FROM node:latest

ENV workdir /usr/src/app

RUN mkdir -p ${workdir}/lib
WORKDIR ${workdir}

COPY package.json ${workdir}
RUN npm install

COPY lib/*.js ${workdir}/lib/
COPY .babelrc ${workdir}/


CMD ["npm", "run", "start-prod"]
