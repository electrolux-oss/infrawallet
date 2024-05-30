exports.seed = async function (knex) {
  await knex('category_mappings').insert([
    {
      provider: 'azure',
      category: 'Analytics',
      // make it compatible with sqlite
      cloud_service_names: JSON.stringify([
        'Azure Monitor',
        'Log Analytics',
        'Network Watcher',
      ]),
    },
    {
      provider: 'azure',
      category: 'Application-Integration',
      cloud_service_names: JSON.stringify(['Logic Apps']),
    },
    {
      provider: 'azure',
      category: 'Compute',
      cloud_service_names: JSON.stringify([
        'Virtual Machines',
        'Azure App Service',
        'Azure Data Factory v2',
        'Functions',
        'Azure Container Apps',
      ]),
    },
    {
      provider: 'azure',
      category: 'Database',
      cloud_service_names: JSON.stringify([
        'Azure Cosmos DB',
        'Azure Database for MySQL',
        'Redis Cache',
        'SQL Database',
      ]),
    },
    {
      provider: 'azure',
      category: 'Developer-Tools',
      cloud_service_names: JSON.stringify([
        'Azure DevOps',
        'Notification Hubs',
        'Visual Studio Subscription',
      ]),
    },
    {
      provider: 'azure',
      category: 'Internet-of-Things',
      cloud_service_names: JSON.stringify([
        'Event Grid',
        'Event Hubs',
        'IoT Hub',
      ]),
    },
    {
      provider: 'azure',
      category: 'Machine-Learning',
      cloud_service_names: JSON.stringify([
        'Azure Cognitive Search',
        'Azure Databricks',
        'Cognitive Services',
      ]),
    },
    {
      provider: 'azure',
      category: 'Networking',
      cloud_service_names: JSON.stringify([
        'Azure Front Door Service',
        'Bandwidth',
        'Content Delivery Network',
        'Load Balancer',
        'NAT Gateway',
        'Service Bus',
        'Traffic Manager',
        'Virtual Network',
        'Network Traversal',
        'Azure DNS',
        'VPN Gateway',
      ]),
    },
    {
      provider: 'azure',
      category: 'Security-Identity-Compliance',
      cloud_service_names: JSON.stringify([
        'Azure Firewall',
        'Key Vault',
        'Microsoft Defender for Cloud',
      ]),
    },
    {
      provider: 'azure',
      category: 'Storage',
      cloud_service_names: JSON.stringify(['Container Registry', 'Storage']),
    },
    {
      provider: 'aws',
      category: 'Analytics',
      cloud_service_names: JSON.stringify([
        'AWS CloudTrail',
        'AWS X-Ray',
        'AmazonCloudWatch',
      ]),
    },
    {
      provider: 'aws',
      category: 'Application-Integration',
      cloud_service_names: JSON.stringify([
        'AWS Config',
        'Amazon API Gateway',
        'AWS Service Catalog',
      ]),
    },
    {
      provider: 'aws',
      category: 'Cloud-Financial-Management',
      cloud_service_names: JSON.stringify(['AWS Cost Explorer']),
    },
    {
      provider: 'aws',
      category: 'Compute',
      cloud_service_names: JSON.stringify([
        'EC2 - Other',
        'Amazon Elastic Compute Cloud - Compute',
        'Amazon Elastic Container Service for Kubernetes',
        'AWS Lambda',
        'AWS Glue',
      ]),
    },
    {
      provider: 'aws',
      category: 'Database',
      cloud_service_names: JSON.stringify([
        'Amazon DynamoDB',
        'Amazon ElastiCache',
        'Amazon Kinesis',
        'Amazon Relational Database Service',
        'DynamoDB Accelerator (DAX)',
      ]),
    },
    {
      provider: 'aws',
      category: 'Developer-Tools',
      cloud_service_names: JSON.stringify([
        'Amazon Simple Notification Service',
        'Amazon Simple Queue Service',
        'AWS Migration Hub Refactor Spaces',
        'AWS CloudShell',
      ]),
    },
    {
      provider: 'aws',
      category: 'Internet-of-Things',
      cloud_service_names: JSON.stringify(['AWS IoT']),
    },
    {
      provider: 'aws',
      category: 'Networking',
      cloud_service_names: JSON.stringify([
        'Amazon Elastic Load Balancing',
        'Amazon Managed Streaming for Apache Kafka',
        'Amazon Route 53',
        'Amazon Timestream',
        'Amazon Virtual Private Cloud',
      ]),
    },
    {
      provider: 'aws',
      category: 'Security-Identity-Compliance',
      cloud_service_names: JSON.stringify([
        'AWS Key Management Service',
        'AWS Secrets Manager',
        'AWS Security Hub',
        'Amazon GuardDuty',
        'AWS WAF',
      ]),
    },
    {
      provider: 'aws',
      category: 'Storage',
      cloud_service_names: JSON.stringify([
        'Amazon Simple Storage Service',
        'Amazon EC2 Container Registry (ECR)',
        'Amazon Glacier',
      ]),
    },
  ]);
};
