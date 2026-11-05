# CandyAI licensing and Community Edition gate

## Finding

The current source-derived CandyAI tree includes Chatwoot's `enterprise/` directory. The upstream root `LICENSE` applies MIT Expat terms to code outside `enterprise/`; the separate `enterprise/LICENSE` imposes different restrictions on Enterprise code, including production-use and redistribution limitations without an applicable subscription/agreement.

Official upstream sources:
- [Chatwoot repository license](https://github.com/chatwoot/chatwoot/blob/develop/LICENSE)
- [Chatwoot Enterprise license](https://github.com/chatwoot/chatwoot/blob/develop/enterprise/LICENSE)
- [Chatwoot self-hosted plans](https://www.chatwoot.com/pricing/self-hosted-plans)

## Release rule

CandyAI's product requirement is no recurring Chatwoot Cloud or Enterprise software subscription. Therefore:

1. Build on the open-source Community Edition capabilities only.
2. Do not depend on Captain/Enterprise-only features or code paths.
3. Preserve upstream MIT notices and third-party license files.
4. Before distributing a public release, create and verify a release tree that excludes Enterprise-only code where appropriate and passes the upstream Community Edition test workflow.
5. Review dependency licenses and generated/vendor assets separately.
6. Do not describe the current full source tree as wholly MIT-licensed until the exact release tree has been audited.

This is a release blocker, not a cosmetic documentation task. It must be resolved before production deployment or public redistribution.
