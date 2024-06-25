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
    };
  };
}
