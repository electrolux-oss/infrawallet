export interface Config {
  backend: {
    infraWallet: {
      autoload?: {
        enabled?: boolean;
        schedule?: string;
        initialDelayMinutes?: number;
      };
      integrations: {
        azure?: {
          name: string;
          subscriptionId: string;
          clientId: string;
          tenantId: string;
          /**
           * @visibility secret
           */
          clientSecret: string;
          tags?: string[];
        }[];
        aws?: {
          name: string;
          accountId: string;
          assumedRoleName?: string;
          /**
           * @visibility secret
           */
          accessKeyId?: string;
          /**
           * @visibility secret
           */
          secretAccessKey?: string;
          /**
           * @visibility secret
           */
          accessKeySecret?: string; // Deprecated Use 'secretAccessKey' instead.
          tags?: string[];
          filters?: [
            {
              type: string;
              attribute: string;
              pattern: string;
            },
          ];
        }[];
        gcp?: {
          name: string;
          /**
           * @visibility secret
           */
          keyFilePath: string;
          projectId: string;
          datasetId: string;
          tableId: string;
          tags?: string[];
        }[];
        confluent?: {
          name: string;
          /**
           * @visibility secret
           */
          apiKey: string;
          /**
           * @visibility secret
           */
          apiSecret: string;
          tags?: string[];
        }[];
        mongoatlas?: {
          name: string;
          orgId: string;
          /**
           * @visibility secret
           */
          publicKey: string;
          /**
           * @visibility secret
           */
          privateKey: string;
          tags?: string[];
        }[];
        datadog?: {
          name: string;
          /**
           * @visibility secret
           */
          apiKey: string;
          /**
           * @visibility secret
           */
          applicationKey: string;
          ddSite: string;
          filters?: [
            {
              type: string;
              attribute: string;
              pattern: string;
            },
          ];
        }[];
        elasticcloud?: {
          name: string;
          organizationId: string;
          /**
           * @visibility secret
           */
          apiKey: string;
          tags?: string[];
          filters?: [
            {
              type: string;
              attribute: string;
              pattern: string;
            },
          ];
        }[];
        github?: {
          name: string;
          organization: string;
          /**
           * @visibility secret
           */
          token: string;
        }[];
        mock?: {
          name: string;
        }[];
      };
      metricProviders?: {
        datadog?: {
          name: string;
          /**
           * @visibility secret
           */
          apiKey: string;
          /**
           * @visibility secret
           */
          applicationKey: string;
          ddSite: string;
        }[];
        grafanaCloud?: {
          name: string;
          url: string;
          datasourceUid: string;
          /**
           * @visibility secret
           */
          token: string;
        }[];
        mock?: {
          name: string;
        }[];
      };
    };
  };
}
