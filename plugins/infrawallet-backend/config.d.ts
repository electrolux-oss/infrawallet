export interface Config {
  backend: {
    infraWallet: {
      integrations: {
        azure?: [
          {
            name: string;
            subscriptionId: string;
            clientId: string;
            tenantId: string;
            /**
             * @visibility secret
             */
            clientSecret: string;
            tags?: string[];
          },
        ];
        aws?: [
          {
            name: string;
            accountId: string;
            assumedRoleName: string;
            /**
             * @visibility secret
             */
            accessKeyId?: string;
            /**
             * @visibility secret
             */
            accessKeySecret?: string;
            tags?: string[];
          },
        ];
        gcp?: [
          {
            name: string;
            keyFilePath: string;
            projectId: string;
            datasetId: string;
            tableId: string;
            tags?: string[];
          },
        ];
      };
      metricProviders?: {
        datadog?: [
          {
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
            metrics?: [
              {
                metricName: string;
                description?: string;
                query: string;
              },
            ];
          },
        ];
        grafanaCloud?: [
          {
            name: string;
            url: string;
            datasourceUid: string;
            /**
             * @visibility secret
             */
            token: string;
            metrics?: [
              {
                metricName: string;
                description?: string;
                query: string;
              },
            ];
          },
        ];
      };
    };
  };
}
