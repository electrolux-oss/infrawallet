export interface Config {
  infraWallet: {
    /**
     * @deepVisibility frontend
     */
    settings: {
      defaultGroupBy?: string; // if not set, `none` will be used
      defaultShowLastXMonths?: number; // if not set, 3 will be used
      readOnly?: boolean; // false by default
      hideWalletTabs?: string[]; // tabs that stay hidden to users, valid values (case insensitive) are: Budgets, Custom Costs, Business Metrics
    };
  };
}
