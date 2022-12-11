<h1 align="center">Welcome to traefik-http-provider-mapper 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <a href="https://github.com/beaussan/traefik-http-provider-mapper#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/beaussan/traefik-http-provider-mapper/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
  <a href="https://twitter.com/beaussan" target="_blank">
    <img alt="Twitter: beaussan" src="https://img.shields.io/twitter/follow/beaussan.svg?style=social" />
  </a>
</p>

> A traefik http provider mapping server to edit an existing http provider, currently focused on integrating Coolify into an existing traefik http provider.

### 🏠 [Homepage](https://github.com/beaussan/traefik-http-provider-mapper#readme)

### ✨ [Blog post](https://beaussan.io/blog/coolify-into-existing-traefik)

## Docker compose install

```yaml
version: '3'

services:
  traefik-http-provider-mapper:
    image: beaussan/traefik-http-provider-mapper
    restart: unless-stopped
    environment:
      # Required, the address of the coolify server
      - TRAEFIK_MAPPER_BASE_ENDPOINT=http://coolify:3000/webhooks/traefik/main.json

      # All the following are optional

      # Replace the web entrypoint with what is provided (eg http here)
      - TRAEFIK_MAPPER_NEW_HTTP_ENTRYPOINT=http
      # Replace the websecure entrypoint with what is provided (eg https here)
      - TRAEFIK_MAPPER_NEW_HTTPS_ENTRYPOINT=https
      # Replace the certificate store (letsencrypt) with what is provided (eg cert here)
      - TRAEFIK_MAPPER_NEW_CERT_RESOLVER=cert

      # Adds this middleware to all routes, ex middlewareName@file for a file base middleware, middlewareName@docker for a docker base middleware
      - TRAEFIK_MAPPER_ADD_MIDDLEWARE_NAME=middlewareName@source

      # Ignore routers for the middlewares. This can be usefull to filter out some domains
      - TRAEFIK_MAPPER_IGNORE_MIDDLEWARE_SITES=some.domain.io;some.other.domain.io

      # Remove coolify itself from the list of services
      - TRAEFIK_MAPPER_FILTER_COOLIFY=true
      # Remove www redirect middleware from the list of middlewares
      - TRAEFIK_MAPPER_FILTER_WWW_MIDDLEWARE=true
      # Remove all http routes from the list of routes
      - TRAEFIK_MAPPER_FILTER_HTTP_ROUTERS=true
      # Remove all www routes from the list of routes
      - TRAEFIK_MAPPER_FILTER_WWW_ROUTERS=true

    networks:
      # Hooks itself into the coolify network that your Traefik instance should be running on
      - coolify
      - coolify-infra
networks:
  coolify:
    external: true
  coolify-infra:
    external: true
```

And then, in your Traefik config, add this url as a [http provider](https://doc.traefik.io/traefik/providers/http/#provider-configuration)

> http://traefik-http-provider-mapper:8080/

And then, you should have every Coolify provided routes in your Traefik instance ! :tada:

## How to work on it locally

### Install

```sh
yarn install
```

### Usage

```sh
yarn build && yarn start:dotenv
```

## Run tests

```sh
yarn run test
```

## Author

👤 **Beaussan**

- Website: https://beaussan.io
- Twitter: [@beaussan](https://twitter.com/beaussan)
- Github: [@beaussan](https://github.com/beaussan)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/beaussan/traefik-http-provider-mapper/issues).

## Show your support

Give a ⭐️ if this project helped you!
