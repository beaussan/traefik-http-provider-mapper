export type Entrypoints = 'web' | 'websecure' | string;
export type Middlewares =
  | 'redirect-to-https'
  | 'redirect-to-non-www'
  | 'redirect-to-http'
  | 'redirect-to-www'
  | string;

export interface Router {
  entrypoints: Entrypoints[];
  rule: string;
  service: string;
  middlewares: Middlewares[];
  tls?: {
    certresolver?: 'letsencrypt' | string;
    domains?: {
      main: string;
    };
  };
}

export interface Service {
  loadbalancer: {
    servers: { url: string }[];
  };
}

export interface TraefikDefinition {
  http: {
    routers: Record<string, Router>;
    services: Record<string, Service>;
    middlewares: Record<string, any>;
  };
}
