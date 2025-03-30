export interface Config {
  infraWallet: {
    /**
     * @deepVisibility frontend
     */
    settings: {
      defaultGroupBy?: string; // if not set, `none` will be used
      defaultShowLastXMonths?: number; // if not set, 3 will be used
      readOnly?: boolean; // false by default

      budgets?: {
        enabled?: boolean; // whether to show budgets or not, default is true
      };

      businessMetrics?: {
        enabled?: boolean; // whether to show business metrics or not, default is true
      };

      customCosts?: {
        enabled?: boolean; // whether to show custom costs or not, default is true
      };
    };
  };
}
