import { Router, Service, TraefikDefinition } from './types';

export interface MapperProps {
  newHttpEntrypointName?: string;
  newHttpsEntrypointName?: string;
  addMiddleware?: string;
  newCertResolver?: string;
  removeHttpRouters?: boolean;
  removeWwwRouters?: boolean;
  removeCoolify?: boolean;
  removeWwwMiddlewares?: boolean;
  ignoreMiddlewareSites?: string[]
}

type MapperFunction = (input: TraefikDefinition) => TraefikDefinition;

const routerMapper =
  (mapperFn: (input: Router, name?: string) => Router): MapperFunction =>
  (input) => {
    return {
      http: {
        ...input.http,
        routers: Object.fromEntries(
          Object.entries(input.http.routers).map(([key, value]) => [
            key,
            mapperFn(value, key),
          ]),
        ),
      },
    };
  };

const renameEntrypoint = (oldName: string, newName: string): MapperFunction =>
  routerMapper((router) => ({
    ...router,
    entrypoints: router.entrypoints.map((it) =>
      it === oldName ? newName : it,
    ),
  }));

const addCustomMiddleware = (middleware: string, ignoreList?: string[]): MapperFunction =>
  routerMapper((router) => {
    if (ignoreList && ignoreList.some(ignoreDomain => router.rule.includes(ignoreDomain))) {
      return router;
    }
    return {
      ...router,
      middlewares: [...router.middlewares, middleware],
    }
  });

const renameHttpEntpoint = (newName: string): MapperFunction =>
  renameEntrypoint('web', newName);
const renameHttpsEntpoint = (newName: string): MapperFunction =>
  renameEntrypoint('websecure', newName);

const renameTlsResolver = (newName: string): MapperFunction =>
  routerMapper((router) =>
    router?.tls?.certresolver
      ? {
          ...router,
          tls: {
            ...router.tls,
            certresolver: newName,
          },
        }
      : router,
  );

const filterRouters =
  (filter: (router: Router, key: string) => boolean): MapperFunction =>
  (input) => {
    return {
      http: {
        ...input.http,
        routers: Object.fromEntries(
          Object.entries(input.http.routers).filter(([key, value]) =>
            filter(value, key),
          ),
        ),
      },
    };
  };

const filterServices =
  (filter: (router: Service, key: string) => boolean): MapperFunction =>
  (input) => {
    return {
      http: {
        ...input.http,
        services: Object.fromEntries(
          Object.entries(input.http.services).filter(([key, value]) =>
            filter(value, key),
          ),
        ),
      },
    };
  };

const filterHttpRouters = (): MapperFunction =>
  filterRouters((router) => !router.entrypoints.includes('web'));

const filterWwwRouters = (): MapperFunction =>
  filterRouters((router) => !router.rule.includes('Host(`www.'));

const filterCoolifyRouter = (): MapperFunction =>
  filterRouters((router, key) => !key.startsWith('coolify'));

const filterCoolifyService = (): MapperFunction =>
  filterServices((router, key) => !key.startsWith('coolify'));

const filterCoolify = (): MapperFunction =>
  compose([filterCoolifyRouter(), filterCoolifyService()]);

const filterMiddlewares =
  (filter: (middleware: any, key: string) => boolean): MapperFunction =>
  (input) => {
    return {
      http: {
        ...input.http,
        middlewares: Object.fromEntries(
          Object.entries(input.http.middlewares).filter(([key, value]) =>
            filter(value, key),
          ),
        ),
      },
    };
  };

const filterOutWwwMiddlewares = (): MapperFunction => (input) => {
  let newDefinition = filterMiddlewares(
    (val, key) => !['redirect-to-non-www', 'redirect-to-www'].includes(key),
  )(input);
  newDefinition = routerMapper((router, name) => {
    return {
      ...router,
      middlewares: router.middlewares.filter(middleware => !['redirect-to-non-www', 'redirect-to-www'].includes(middleware))
    };
  })(newDefinition);
  return newDefinition;
}


const compose =
  (funcs: MapperFunction[]): MapperFunction =>
  (initialArg: TraefikDefinition) =>
    funcs.reduce((acc, func) => func(acc), initialArg);

export const mapper = (
  inputDefinition: TraefikDefinition,
  {
    newHttpEntrypointName,
    newHttpsEntrypointName,
    addMiddleware,
    removeHttpRouters,
    removeWwwRouters,
    newCertResolver,
    removeCoolify,
    removeWwwMiddlewares,
    ignoreMiddlewareSites,
  }: MapperProps,
): TraefikDefinition => {
  let newDefinition = inputDefinition;

  const actions: MapperFunction[] = [];

  // filters
  if (removeHttpRouters) {
    actions.push(filterHttpRouters());
  }

  if (removeWwwRouters) {
    actions.push(filterWwwRouters());
  }

  // mappers
  if (newHttpEntrypointName) {
    actions.push(renameHttpEntpoint(newHttpEntrypointName));
  }
  if (newHttpsEntrypointName) {
    actions.push(renameHttpsEntpoint(newHttpsEntrypointName));
  }
  if (newCertResolver) {
    actions.push(renameTlsResolver(newCertResolver));
  }
  if (removeCoolify) {
    actions.push(filterCoolify());
  }
  if (removeWwwMiddlewares) {
    actions.push(filterOutWwwMiddlewares());
  }

  // adders
  if (addMiddleware) {
    actions.push(addCustomMiddleware(addMiddleware, ignoreMiddlewareSites));
  }
  return compose(actions)(newDefinition);
};
