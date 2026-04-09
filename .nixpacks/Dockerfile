FROM ghcr.io/railwayapp/nixpacks:ubuntu-1745885067

ENTRYPOINT ["/bin/bash", "-l", "-c"]
WORKDIR /app/


COPY .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix
RUN nix-env -if .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix && nix-collect-garbage -d


ARG CI CLAVE_MAESTRA DATABASE_URL FRONTEND_URL GIT_SHA JWT_SECRET NIXPACKS_METADATA NODE_ENV NPM_CONFIG_PRODUCTION PORT SESSION_EXPIRY_HOURS
ENV CI=$CI CLAVE_MAESTRA=$CLAVE_MAESTRA DATABASE_URL=$DATABASE_URL FRONTEND_URL=$FRONTEND_URL GIT_SHA=$GIT_SHA JWT_SECRET=$JWT_SECRET NIXPACKS_METADATA=$NIXPACKS_METADATA NODE_ENV=$NODE_ENV NPM_CONFIG_PRODUCTION=$NPM_CONFIG_PRODUCTION PORT=$PORT SESSION_EXPIRY_HOURS=$SESSION_EXPIRY_HOURS

# setup phase
# noop

# install phase
ENV NIXPACKS_PATH=/app/node_modules/.bin:$NIXPACKS_PATH
COPY . /app/.
RUN --mount=type=cache,id=e6ZR98FtWw-/root/npm,target=/root/.npm npm ci

# build phase
# noop


RUN printf '\nPATH=/app/node_modules/.bin:$PATH' >> /root/.profile


# start
COPY . /app

CMD ["npm run start"]

