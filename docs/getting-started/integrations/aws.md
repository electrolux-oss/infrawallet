# AWS

InfraWallet uses an IAM role to retrieve cost and usage data via the AWS Cost Explorer APIs. Before configuring InfraWallet, you must set up the necessary AWS IAM role and policy.

## For Management Accounts

If you have a [management account](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html#management-account), this setup only needs to be done once within the management account. InfraWallet will then be able to retrieve cost data across all [member accounts](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html#member-account).

## For Non-Management Accounts

If you're not using a [management account](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html#management-account), you'll need to create a role in each AWS account and configure trust relationships individually.

## Required IAM Role Permissions

The IAM role must have the following permissions to access cost and usage data:

```json
{
  "Statement": [
    {
      "Action": ["ce:GetCostAndUsage", "ce:GetTags"],
      "Effect": "Allow",
      "Resource": "*",
      "Sid": ""
    }
  ],
  "Version": "2012-10-17"
}
```

## Configuration

Once the IAM roles and policies are in place, add the following configuration to your `app-config.yaml` file:

```yaml
backend:
  infraWallet:
    integrations:
      aws:
        - name: <unique_name_of_this_integration>
          accountId: '<12-digit_account_ID>' # quoted as a string
          assumedRoleName: <name_of_the_AWS_IAM_role_to_be_assumed> # optional, only needed if you want to assume a role
          accessKeyId: <access_key_ID_of_AWS_IAM_user_that_assumes_the_role> # optional, only needed when an IAM user is used. if assumedRoleName is also provided, this user is used to assume the role
          accessKeySecret: <access_key_secret_of_AWS_IAM_user_that_assumes_the_role> # optional, only needed when an IAM user is used. if assumedRoleName is also provided, this user is used to assume the role
```

InfraWallet's AWS client is built using the AWS SDK for JavaScript. If both `accessKeyId` and `accessKeySecret` are provided in the configuration, the client will use the specified IAM user. If `assumedRoleName` is set, the client will assume that role (if `accessKeyId` and `accessKeySecret` is also provided, that IAM user will assume the role). Otherwise, it follows the [default credential provider chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html#credchain).

When your environment already has the AWS auth in-place, the configuration will look like this:

```yaml
backend:
  infraWallet:
    integrations:
      aws:
        - name: <unique_name_of_this_integration>
          accountId: '<12-digit_account_ID>' # quoted as a string
```
