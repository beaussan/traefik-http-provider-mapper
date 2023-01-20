import { describe, expect, it } from 'vitest';
import { mapper } from './mapper';
import { Router, TraefikDefinition } from './types';

const generateRouters = (
  routers: Record<string, Router>,
): TraefikDefinition => {
  return {
    http: {
      routers,
      services: {},
      middlewares: {
        'redirect-to-http': {},
        'redirect-to-https': {},
        'redirect-to-non-www': {},
        'redirect-to-www': {},
      },
    },
  };
};

describe('mapper', () => {
  it('should map http entrypoint, while leaving others', () => {
    const mock = generateRouters({
      test1: {
        entrypoints: ['web', 'websecure'],
        middlewares: [],
        rule: '',
        service: '',
      },
      test2: {
        entrypoints: ['websecure'],
        middlewares: [],
        rule: '',
        service: '',
      },
    });

    const result = mapper(mock, { newHttpEntrypointName: 'myHttp' });

    expect(result.http.routers.test1.entrypoints).toEqual([
      'myHttp',
      'websecure',
    ]);
    expect(result.http.routers.test2.entrypoints).toEqual(['websecure']);
  });

  it('should map https entrypoint, while leaving others', () => {
    const mock = generateRouters({
      test1: {
        entrypoints: ['web', 'websecure'],
        middlewares: [],
        rule: '',
        service: '',
      },
      test2: {
        entrypoints: ['websecure'],
        middlewares: [],
        rule: '',
        service: '',
      },
    });

    const result = mapper(mock, { newHttpsEntrypointName: 'myHttps' });

    expect(result.http.routers.test1.entrypoints).toEqual(['web', 'myHttps']);
    expect(result.http.routers.test2.entrypoints).toEqual(['myHttps']);
  });

  it('should map the certresolver entrypoint, while leaving others', () => {
    const mock = generateRouters({
      test1: {
        entrypoints: ['web', 'websecure'],
        middlewares: [],
        tls: {
          certresolver: 'letsencrypt',
          domains: {
            main: 'aaaa',
          },
        },
        rule: '',
        service: '',
      },

      test2: {
        entrypoints: ['web', 'websecure'],
        middlewares: [],
        tls: {
          domains: {
            main: 'aaaa',
          },
        },
        rule: '',
        service: '',
      },
    });

    const result = mapper(mock, { newCertResolver: 'myLetsEncrypt' });

    expect(result.http.routers.test1.tls?.certresolver).toEqual(
      'myLetsEncrypt',
    );
    expect(result.http.routers.test2.tls).toEqual(mock.http.routers.test2.tls);
  });

  it('should filter out http routers if asked to', () => {
    const mock = generateRouters({
      test1: {
        entrypoints: ['web'],
        middlewares: [],
        rule: '',
        service: '',
      },
      test2: {
        entrypoints: ['websecure'],
        middlewares: [],
        rule: '',
        service: '',
      },
    });

    const result = mapper(mock, { removeHttpRouters: true });

    expect(Object.values(result.http.routers)).toHaveLength(1);
  });

  it('should filter out http routers if asked to even if there is name mapping', () => {
    const mock = generateRouters({
      test1: {
        entrypoints: ['web'],
        middlewares: [],
        rule: '',
        service: '',
      },
      test2: {
        entrypoints: ['websecure'],
        middlewares: [],
        rule: '',
        service: '',
      },
    });

    const result = mapper(mock, {
      removeHttpRouters: true,
      newHttpEntrypointName: 'myHttp',
    });

    expect(Object.values(result.http.routers)).toHaveLength(1);
  });

  it('should filter out www routers if asked to', () => {
    const mock = generateRouters({
      test1: {
        entrypoints: ['web'],
        middlewares: [],
        rule: 'Host(`www.coolify.example.io`)',
        service: '',
      },
      test2: {
        entrypoints: ['websecure'],
        middlewares: [],
        rule: 'Host(`coolify.example.io`)',
        service: '',
      },
    });

    const result = mapper(mock, {
      removeWwwRouters: true,
    });

    expect(Object.values(result.http.routers)).toHaveLength(1);
    expect(Object.values(result.http.routers.test2)).toBeDefined();
  });

  it('show allow to add a middleware to all routers', () => {
    const mock = generateRouters({
      test1: {
        entrypoints: ['web'],
        middlewares: [],
        rule: 'Host(`www.coolify.example.io`)',
        service: '',
      },
      test2: {
        entrypoints: ['websecure'],
        middlewares: ['existing'],
        rule: 'Host(`coolify.example.io`)',
        service: '',
      },
    });

    const result = mapper(mock, {
      addMiddleware: 'auth',
    });

    expect(result.http.routers.test1.middlewares).toEqual(['auth']);
    expect(result.http.routers.test2.middlewares).toEqual(['existing', 'auth']);
  });


  it('show allow to add a middleware to all routers exept the ignore list', () => {
    const mock = generateRouters({
      test1: {
        entrypoints: ['web'],
        middlewares: [],
        rule: 'Host(`www.coolify.example.io`)',
        service: '',
      },
      test2: {
        entrypoints: ['websecure'],
        middlewares: ['existing'],
        rule: 'Host(`coolify.example.io`)',
        service: '',
      },
      test3: {
        entrypoints: ['websecure'],
        middlewares: ['existing'],
        rule: 'Host(`toignore.example.io`)',
        service: '',
      },
    });

    const result = mapper(mock, {
      addMiddleware: 'auth',
      ignoreMiddlewareSites: ['toignore.example.io']

    });

    expect(result.http.routers.test1.middlewares).toEqual(['auth']);
    expect(result.http.routers.test2.middlewares).toEqual(['existing', 'auth']);
    expect(result.http.routers.test3.middlewares).toEqual(['existing']);
  });

  it('should filter out the coolify router if asked to', () => {
    const mock = generateRouters({
      'test2': {
        entrypoints: ['websecure'],
        rule: 'Host(`dash-bis.example.io`)',
        service: 'cl40a7hrx5046cwnkfy4c867q',
        tls: {
          certresolver: 'letsencrypt',
        },
        middlewares: [],
      },
      'coolify': {
        entrypoints: ['web'],
        rule: 'Host(`coolify.example.io`) || Host(`www.coolify.example.io`)',
        service: 'coolify',
        middlewares: ['redirect-to-https', 'redirect-to-non-www'],
      },
      'coolify-secure-www': {
        entrypoints: ['websecure'],
        rule: 'Host(`www.coolify.example.io`)',
        service: 'coolify',
        tls: {
          domains: {
            main: 'coolify.example.io',
          },
        },
        middlewares: ['redirect-to-non-www'],
      },
      'coolify-secure': {
        entrypoints: ['websecure'],
        rule: 'Host(`coolify.example.io`)',
        service: 'coolify',
        tls: {
          certresolver: 'letsencrypt',
        },
        middlewares: [],
      },
    });

    const result = mapper(mock, {
      removeCoolify: true,
    });

    expect(Object.values(result.http.routers)).toHaveLength(1);
    expect(Object.values(result.http.routers.test2)).toBeDefined();
  });

  it('should filter out the www middlewares if asked to', () => {
    const mock: TraefikDefinition = {
      http: {
        routers: {
          'app': {
            entrypoints: ['web'],
            rule: 'Host(`dash-bis.example.io`) || Host(`www.dash-bis.example.io`)',
            service: 'cl40a7hrx5046cwnkfy4c867q',
            middlewares: ['redirect-to-http', 'redirect-to-https', 'redirect-to-non-www', 'redirect-to-www'],
          },
        },
        services: {},
        middlewares: {
          'redirect-to-http': {},
          'redirect-to-https': {},
          'redirect-to-non-www': {},
          'redirect-to-www': {},
        },
      },
    };

    const result = mapper(mock, {
      removeWwwMiddlewares: true,
    });

    expect(Object.values(result.http.middlewares)).toHaveLength(2);
    expect(result.http.routers.app.middlewares).toHaveLength(2);
    expect(result.http.routers.app.middlewares).toMatchInlineSnapshot(`
      [
        "redirect-to-http",
        "redirect-to-https",
      ]
    `);
  });

  it('should work if all options are combined', () => {
    const example: TraefikDefinition = {
      http: {
        routers: {
          'cl40a7hrx5046cwnkfy4c867q': {
            entrypoints: ['web'],
            rule: 'Host(`dash-bis.example.io`) || Host(`www.dash-bis.example.io`)',
            service: 'cl40a7hrx5046cwnkfy4c867q',
            middlewares: ['redirect-to-https', 'redirect-to-non-www'],
          },
          'cl40a7hrx5046cwnkfy4c867q-secure-www': {
            entrypoints: ['websecure'],
            rule: 'Host(`www.dash-bis.example.io`)',
            service: 'cl40a7hrx5046cwnkfy4c867q',
            tls: {
              domains: {
                main: 'dash-bis.example.io',
              },
            },
            middlewares: ['redirect-to-non-www'],
          },
          'cl40a7hrx5046cwnkfy4c867q-secure': {
            entrypoints: ['websecure'],
            rule: 'Host(`dash-bis.example.io`)',
            service: 'cl40a7hrx5046cwnkfy4c867q',
            tls: {
              certresolver: 'letsencrypt',
            },
            middlewares: [],
          },
          'coolify': {
            entrypoints: ['web'],
            rule: 'Host(`coolify.example.io`) || Host(`www.coolify.example.io`)',
            service: 'coolify',
            middlewares: ['redirect-to-https', 'redirect-to-non-www'],
          },
          'coolify-secure-www': {
            entrypoints: ['websecure'],
            rule: 'Host(`www.coolify.example.io`)',
            service: 'coolify',
            tls: {
              domains: {
                main: 'coolify.example.io',
              },
            },
            middlewares: ['redirect-to-non-www'],
          },
          'coolify-secure': {
            entrypoints: ['websecure'],
            rule: 'Host(`coolify.example.io`)',
            service: 'coolify',
            tls: {
              certresolver: 'letsencrypt',
            },
            middlewares: [],
          },
        },
        services: {
          cl40a7hrx5046cwnkfy4c867q: {
            loadbalancer: {
              servers: [
                {
                  url: 'http://cl40a7hrx5046cwnkfy4c867q:3000',
                },
              ],
            },
          },
          coolify: {
            loadbalancer: {
              servers: [
                {
                  url: 'http://coolify:3000',
                },
              ],
            },
          },
        },
        middlewares: {
          'redirect-to-https': {
            redirectscheme: {
              scheme: 'https',
            },
          },
          'redirect-to-http': {
            redirectscheme: {
              scheme: 'http',
            },
          },
          'redirect-to-non-www': {
            redirectregex: {
              regex: '^https?://www\\.(.+)',
              replacement: 'http://${1}',
            },
          },
          'redirect-to-www': {
            redirectregex: {
              regex: '^https?://(?:www\\.)?(.+)',
              replacement: 'http://www.${1}',
            },
          },
        },
      },
    };
    const result = mapper(example, {
      newHttpEntrypointName: 'http',
      newHttpsEntrypointName: 'https',
      removeHttpRouters: true,
      removeWwwRouters: true,
      removeCoolify: true,
      newCertResolver: 'myLetsEncrypt',
      removeWwwMiddlewares: true,
      addMiddleware: 'auth',
    });

    expect(result.http).toMatchInlineSnapshot(`
      {
        "middlewares": {
          "redirect-to-http": {
            "redirectscheme": {
              "scheme": "http",
            },
          },
          "redirect-to-https": {
            "redirectscheme": {
              "scheme": "https",
            },
          },
        },
        "routers": {
          "cl40a7hrx5046cwnkfy4c867q-secure": {
            "entrypoints": [
              "https",
            ],
            "middlewares": [
              "auth",
            ],
            "rule": "Host(\`dash-bis.example.io\`)",
            "service": "cl40a7hrx5046cwnkfy4c867q",
            "tls": {
              "certresolver": "myLetsEncrypt",
            },
          },
        },
        "services": {
          "cl40a7hrx5046cwnkfy4c867q": {
            "loadbalancer": {
              "servers": [
                {
                  "url": "http://cl40a7hrx5046cwnkfy4c867q:3000",
                },
              ],
            },
          },
        },
      }
    `);
  });
});
