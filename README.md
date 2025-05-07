<h1>
  <img style="height: 1em;" src="./plugins/infrawallet/docs/images/iw_logo.png" alt="logo" title="InfraWallet">
  InfraWallet<sup>®</sup>
</h1>

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=electrolux-oss_infrawallet&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=electrolux-oss_infrawallet)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/electrolux-oss/infrawallet/badge)](https://scorecard.dev/viewer/?uri=github.com/electrolux-oss/infrawallet)
[![GitHub Release](https://img.shields.io/github/v/release/electrolux-oss/infrawallet)](https://github.com/electrolux-oss/infrawallet/releases)
![NPM Downloads](https://img.shields.io/npm/dm/%40electrolux-oss%2Fplugin-infrawallet)

> Control your cloud costs just in the way how you control your bank accounts

![InfraWallet](./plugins/infrawallet/docs/images/iw_demo.gif)

## Highlights

- Flexible aggregation options for cloud costs across multiple platforms and accounts\*
- Cost categorization for aggregating expenses across different cloud vendors with configurable category mappings
- Swift response times with cached cost data, ensuring rapid access to financial insights fetched from cloud platforms
- Easy configuration and deployment as a Backstage plugin, both frontend and backend plugins are production-ready

## Supported Cloud Providers

| Provider  | Cost Reports | Filter Costs by Tags | Integration Levels                    |
| --------- | ------------ | -------------------- | ------------------------------------- |
| AWS       | ✅           | ✅                   | Management account and member account |
| Azure     | ✅           | ✅                   | Subscription                          |
| GCP       | ✅           |                      | Billing account                       |
| MongoDB   | ✅           |                      | Organization                          |
| Confluent | ✅           |                      | Organization                          |
| Datadog   | ✅           |                      | Parent organization                   |

\*_The framework is designed to be extensible to support other cloud providers. Feel free to [contribute](./docs/contributing.md) to the project._

\*\*_You can also manually add custom costs using InfraWallet UI if there is no integration. See more about this feature on this [page](./docs/getting-started/custom-costs.md)._

## Getting started

To start using InfraWallet, see the [documentation](./docs/getting-started.md).

## Contributing to InfraWallet

There are different ways to contribute to InfraWallet, see examples [here](https://medium.com/@infrawalletbox/contribute-to-infrawallet-5-ways-to-get-started-today-42051b8ff8c6). To join the coding, you can start from this [documentation](./docs/contributing.md).

If your organization uses InfraWallet, we'd love to have you listed in [Adopters](ADOPTERS.md).

## Roadmap

- [x] Make IAM user optional for AWS credentials
- [x] Support Google Cloud Costs
- [x] Support filters besides grouping bys
- [ ] WebUI for managing category mappings
- [ ] Enable users to select a subset of configured cloud accounts as a wallet
- [ ] Support different currencies
