# InfraWallet

> _Control your cloud costs just in the way how you control your bank accounts_

InfraWallet is a powerful [Backstage](https://backstage.io/) plugin designed to help organizations gain full visibility and control over their cloud costs. By aggregating, categorizing, and analyzing costs across multiple cloud providers, InfraWallet empowers teams to make informed financial decisions and optimize their cloud spending.

With its seamless integration into Backstage, InfraWallet provides a unified interface for managing cloud costs, enabling teams to collaborate effectively. Whether you're tracking costs for AWS, Azure, Google Cloud, or other providers, InfraWallet simplifies cost management with its intuitive features and flexible configuration options.

![InfraWallet](images/iw_demo.gif)

## How it Works

```mermaid
flowchart LR
    classDef userStyle fill:#f3f8ff,stroke:#1e88e5,stroke-width:2px,color:#1e88e5;
    classDef backstageStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#1976d2;
    classDef backendStyle fill:#fffde7,stroke:#fbc02d,stroke-width:2px,color:#fbc02d;
    classDef frontendStyle fill:#e8f5e9,stroke:#43a047,stroke-width:2px,color:#43a047;
    classDef providerStyle fill:#f3e5f5,stroke:#8e24aa,stroke-width:2px,color:#8e24aa;

    User[User]
    class user userStyle

    subgraph Backstage
      Frontend[InfraWallet<br/>Frontend]
      Backend[InfraWallet<br/>Backend]
      class Frontend frontendStyle
      class Backend backendStyle
    end
    class Backstage backstageStyle

    subgraph Cloud Providers
      AWS[AWS]
      Azure[Azure]
      GCP[Google<br/>Cloud]
      Others[Others]
      class AWS,Azure,GCP,Others providerStyle
    end

    User -->|Visualization| Frontend
    Frontend --> Backend

    Backend -->|Cost Data| AWS
    Backend -->|Cost Data| Azure
    Backend -->|Cost Data| GCP
    Backend -->|Cost Data| Others
```

## Highlights

- **Multi-Cloud Cost Aggregation**: Aggregate cloud costs across multiple platforms and accounts with ease.
- **Cost Categorization**: Group and analyze costs across different cloud providers using configurable category mappings.
- **Fast and Responsive**: Leverage cached cost data for swift response times and rapid access to financial insights.
- **Production-Ready**: Easy to configure and deploy as a Backstage plugin, with both frontend and backend components ready for production use.
