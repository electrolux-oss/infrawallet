exports.seed = async knex => {
  await knex('category_mappings').insert([
    {
      provider: 'azure',
      category: 'Analytics',
      // make it compatible with sqlite
      cloud_service_names: JSON.stringify(['Event Hubs', 'Log Analytics']),
    },
    {
      provider: 'azure',
      category: 'Application Integration',
      cloud_service_names: JSON.stringify(['Logic Apps']),
    },
    {
      provider: 'azure',
      category: 'Compute',
      cloud_service_names: JSON.stringify([
        'Virtual Machines',
        'Azure App Service',
        'Functions',
      ]),
    },
    {
      provider: 'azure',
      category: 'Containers',
      cloud_service_names: JSON.stringify([
        'Azure Container Apps',
        'Container Registry',
      ]),
    },
    {
      provider: 'azure',
      category: 'Database',
      cloud_service_names: JSON.stringify([
        'Azure Cosmos DB',
        'Azure Data Factory v2',
        'Azure Database for MySQL',
        'Redis Cache',
        'SQL Database',
      ]),
    },
    {
      provider: 'azure',
      category: 'Developer Tools',
      cloud_service_names: JSON.stringify([
        'Azure DevOps',
        'Notification Hubs',
        'Visual Studio Subscription',
      ]),
    },
    {
      provider: 'azure',
      category: 'DevOps',
      cloud_service_names: JSON.stringify(['Azure Monitor']),
    },
    {
      provider: 'azure',
      category: 'Internet of Things',
      cloud_service_names: JSON.stringify(['Event Grid', 'IoT Hub']),
    },
    {
      provider: 'azure',
      category: 'Artificial Intelligence',
      cloud_service_names: JSON.stringify([
        'Azure Cognitive Search',
        'Azure Databricks',
        'Cognitive Services',
      ]),
    },
    {
      provider: 'azure',
      category: 'Management & Governance',
      cloud_service_names: JSON.stringify(['Network Watcher']),
    },
    {
      provider: 'azure',
      category: 'Networking',
      cloud_service_names: JSON.stringify([
        'Azure DNS',
        'Azure Front Door Service',
        'Bandwidth',
        'Content Delivery Network',
        'Load Balancer',
        'NAT Gateway',
        'Network Traversal',
        'Service Bus',
        'Traffic Manager',
        'Virtual Network',
        'VPN Gateway',
      ]),
    },
    {
      provider: 'azure',
      category: 'Security, Identity, & Compliance',
      cloud_service_names: JSON.stringify([
        'Azure Firewall',
        'Key Vault',
        'Microsoft Defender for Cloud',
      ]),
    },
    {
      provider: 'azure',
      category: 'Storage',
      cloud_service_names: JSON.stringify(['Storage']),
    },
    {
      provider: 'aws',
      category: 'Analytics',
      cloud_service_names: JSON.stringify([
        'Amazon Kinesis',
        'Amazon Managed Streaming for Apache Kafka',
        'Amazon QuickSight',
        'AWS Glue',
      ]),
    },
    {
      provider: 'aws',
      category: 'Application Integration',
      cloud_service_names: JSON.stringify([
        'Amazon API Gateway',
        'Amazon Simple Notification Service',
        'Amazon Simple Queue Service',
      ]),
    },
    {
      provider: 'aws',
      category: 'Cloud Financial Management',
      cloud_service_names: JSON.stringify(['AWS Cost Explorer']),
    },
    {
      provider: 'aws',
      category: 'Compute',
      cloud_service_names: JSON.stringify([
        'EC2 - Other',
        'Amazon Elastic Compute Cloud - Compute',
        'AWS Lambda',
      ]),
    },
    {
      provider: 'aws',
      category: 'Containers',
      cloud_service_names: JSON.stringify([
        'Amazon Elastic Container Service for Kubernetes',
        'Amazon Elastic Container Registry (ECR)',
      ]),
    },
    {
      provider: 'aws',
      category: 'Database',
      cloud_service_names: JSON.stringify([
        'Amazon DynamoDB',
        'Amazon ElastiCache',
        'Amazon Relational Database Service',
        'Amazon Timestream',
        'DynamoDB Accelerator (DAX)',
      ]),
    },
    {
      provider: 'aws',
      category: 'Developer Tools',
      cloud_service_names: JSON.stringify(['AWS CloudShell', 'AWS X-Ray']),
    },
    {
      provider: 'aws',
      category: 'Internet of Things',
      cloud_service_names: JSON.stringify(['AWS IoT']),
    },
    {
      provider: 'aws',
      category: 'Management & Governance',
      cloud_service_names: JSON.stringify([
        'AmazonCloudWatch',
        'AWS CloudTrail',
        'AWS Config',
        'AWS Service Catalog',
      ]),
    },
    {
      provider: 'aws',
      category: 'Migration',
      cloud_service_names: JSON.stringify([
        'AWS Migration Hub Refactor Spaces',
      ]),
    },
    {
      provider: 'aws',
      category: 'Networking',
      cloud_service_names: JSON.stringify([
        'Amazon Elastic Load Balancing',
        'Amazon Route 53',
        'Amazon Virtual Private Cloud',
      ]),
    },
    {
      provider: 'aws',
      category: 'Security, Identity, & Compliance',
      cloud_service_names: JSON.stringify([
        'Amazon GuardDuty',
        'AWS Key Management Service',
        'AWS Secrets Manager',
        'AWS Security Hub',
        'AWS WAF',
      ]),
    },
    {
      provider: 'aws',
      category: 'Storage',
      cloud_service_names: JSON.stringify([
        'Amazon Glacier',
        'Amazon Simple Storage Service',
      ]),
    },
  ]);
};
