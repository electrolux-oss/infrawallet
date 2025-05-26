# :simple-github: GitHub

InfraWallet supports integration with GitHub and GitHub Enterprise Cloud to help you track and analyze your GitHub-related costs, such as Actions, Packages, Copilot, and more. InfraWallet fetches cost data from the GitHub [Enhanced Billing API](https://docs.github.com/en/rest/billing/enhanced-billing){target="\_blank"}.

## Prerequisites

- You must have admin access to your GitHub organization.
- A fine-grained token with Organization permissions: **Administration** (read)

## Configuration

Add your GitHub integration in your `app-config.yaml`:

```yaml
backend:
  infraWallet:
    integrations:
      github:
        - name: <unique_name_1>
          token: <your_github_token_1>
          organization: <your_github_org1_name> # not case sensitive
        - name: <unique_name_2>
          token: <your_github_token_2>
          organization: <your_github_org2_name> # not case sensitive
```
