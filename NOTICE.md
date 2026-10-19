# Third-party and upstream notice

CandyAI is derived from the open-source portions of [Chatwoot](https://github.com/chatwoot/chatwoot).

The upstream Chatwoot root `LICENSE` states that content outside `enterprise/` is available under the MIT Expat license, subject to third-party notices. The upstream `enterprise/LICENSE` has separate restrictions and does not grant general production or redistribution rights without the applicable Chatwoot Enterprise subscription/agreement.

**Important:** source-derived CandyAI branches currently contain an `enterprise/` directory from the upstream tree. Do not assume that every file in the current repository is MIT-licensed, and do not ship or use Enterprise-only code in production without a valid license. A release intended to be fully open-source and free of Chatwoot subscription dependencies must use only code permitted under the applicable open-source license, preserve upstream notices, audit dependencies, and be reviewed before distribution.

CandyAI-specific additions are maintained under the `CandyAI` namespace where practical. This notice does not replace legal review of the exact release tree or third-party licenses.
