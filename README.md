[github-secrets-ref]: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
[github-vars-ref]: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables
[stm-ref]: https://www.digicert.com/software-trust-manager
[tool-cache-ref]: https://github.com/actions/toolkit/tree/main/packages/cache
[digicert-sales-ref]: https://www.digicert.com/contact-us
[github-hosted-runners-ref]: https://docs.github.com/en/actions/concepts/runners/github-hosted-runners
[self-hosted-runners-ref]: https://docs.github.com/en/actions/concepts/runners/self-hosted-runners

# Code signing with DigiCert® Software Trust Manager

Code signing using DigiCert® Software Trust Manager with GitHub Actions is a streamlined, keypair-based signing workflow that improves software security and seamlessly integrates with DevOps processes to sign binaries on **Windows**, **Linux**, and **macOS**.

GitHub Actions automates the installation and configuration of Software Trust client tools, enabling developers to quickly become signing-ready for workflows on [GitHub-hosted runners][github-hosted-runners-ref] and [self-hosted runners][self-hosted-runners-ref].

Additionally, Software Trust with GitHub Actions offers **simple signing**, a mode which allows users to sign without the need of third-party tools or libraries.

 **DigiCert Binary Signing** includes all existing code signing capabilities as [the legacy Code signing with Software Trust Manager](https://github.com/marketplace/actions/code-signing-with-software-trust-manager), along with additional enhancements that simplify and scale your signing workflows.

## Introduction to Software Trust

Software Trust provides a solution to manage and automate your code signing workflows in a secure way.

**Software Trust will:**

- Require multi-factor authentication (MFA) for signing
- Prevent unauthorized access or misuse of keys and certificates
- Enforce consistency and compliance of security policies
- Protect against the insertion of malware during software releases
- Expedite remediation by providing an audit history of all actions taken within your account

**Software Trust allows you to securely:**

- Generate and manage your credentials
- Create, edit, import, export, or delete keypairs
- Generate certificates using a keypair in your account
- View your audit and signature logs
- Create releases
- Sign code

## Before you begin

As a best practice, consider enabling simple signing mode for your new implementations. 

Simple signing mode:

- **Simplifies your workflow**: There is no need for third-party signing tools (SignTool, Jarsigner, etc.) or intermediate libraries (KSP, PKCS#11, etc.).
- **Offers cross-platform support**: This mode works seamlessly across Windows, Linux, and macOS.
- **Provides a unified signing experience**: There is a single, consistent approach for all supported file types.
- **Is future ready**: As we deprecate legacy signing methods, this mode is aligned with our strategic direction.
- **Offers better performance**: Simple signing mode is faster than traditional signing because there is no need for intermediate libraries, third-party tool integrations, or unnecessary API calls.
- **Supports bulk signing**: You can enable `bulk-sign-mode: true` to sign multiple files in a single batch operation, significantly reducing network round trips and improving throughput for large-scale signing. (By default, this feature is disabled and is only available for Software Trust users. To enable this feature, [contact DigiCert][digicert-sales-ref].)

By default, the simple signing mode is disabled to ensure seamless migration from our legacy GitHub Actions without breaking existing workflows. However, we encourage all new users to adopt simple signing and all existing users to migrate when possible.


## Get started

### Step 1: Obtain a DigiCert ONE account

Software Trust is part of the DigiCert® ONE platform, which also includes DigiCert® Trust Lifecycle Manager, DigiCert® Document Trust Manager, and DigiCert® IoT Trust Manager, enabling organizations to manage their diverse PKI workflows from a single pane of glass.

To access Software Trust, you must have a DigiCert ONE account. If you don't have a DigiCert ONE account, you can request a 30-day free trial account from [DigiCert Sales][digicert-sales-ref].

### Step 2: Add steps to your workflow YAML file

Copy and paste one of the following steps into your GitHub Actions workflow YAML file to obtain the latest stable version of Software Trust. 

To learn more about these steps, see [action.yml](action.yml).

#### For Windows

*Option 1: Software Trust with standard features:*

```yaml
steps:
  - name: Setup SM_CLIENT_CERT_FILE from base64 secret data
    run: |
      echo "${{ secrets.SM_CLIENT_CERT_FILE_B64 }}" | base64 --decode > /d/Certificate_pkcs12.p12
    shell: bash
  - name: Setup Software Trust Manager
    uses: digicert/code-signing-software-trust-action@v1
    env:
      SM_HOST: ${{ vars.SM_HOST }}
      SM_API_KEY: ${{ secrets.SM_API_KEY }}
      SM_CLIENT_CERT_FILE: D:\\Certificate_pkcs12.p12
      SM_CLIENT_CERT_PASSWORD: ${{ secrets.SM_CLIENT_CERT_PASSWORD }}
    shell: bash
```

*Option 2: Software Trust with simple signing **(recommended)**:*

```yaml
steps:
  - name: Setup SM_CLIENT_CERT_FILE from base64 secret data
    run: |
      echo "${{ secrets.SM_CLIENT_CERT_FILE_B64 }}" | base64 --decode > /d/Certificate_pkcs12.p12
    shell: bash
  - name: Setup Software Trust Manager
    uses: digicert/code-signing-software-trust-action@v1
    with:
      simple-signing-mode: true
      # If the below 2 parameters are supplied, then smctl executable is invoked to attempt the signing.
      input: <file or directory with list of supported files to sign>
      keypair-alias: <a Software Trust Manager keypair to sign with>
    env:
      SM_HOST: ${{ vars.SM_HOST }}
      SM_API_KEY: ${{ secrets.SM_API_KEY }}
      SM_CLIENT_CERT_FILE: D:\\Certificate_pkcs12.p12
      SM_CLIENT_CERT_PASSWORD: ${{ secrets.SM_CLIENT_CERT_PASSWORD }}
    shell: bash
```

#### For Ubuntu and macOS

*Option 1: Software Trust with standard features:*

```yaml
steps:
  - name: Setup SM_CLIENT_CERT_FILE from base64 secret data
    run: |
      export SM_CLIENT_CERT_FILE=${RUNNER_TEMP_DIR}/sm_client_cert.p12
      echo "${{ secrets.SM_CLIENT_CERT_FILE_B64 }}" | base64 --decode > ${SM_CLIENT_CERT_FILE}
    shell: bash
  - name: Setup Software Trust Manager
    uses: digicert/code-signing-software-trust-action@v1
    env:
      SM_HOST: ${{ vars.SM_HOST }}
      SM_API_KEY: ${{ secrets.SM_API_KEY }}
      SM_CLIENT_CERT_FILE: ${SM_CLIENT_CERT_FILE}
      SM_CLIENT_CERT_PASSWORD: ${{ secrets.SM_CLIENT_CERT_PASSWORD }}
    shell: bash
```

*Option 2: Software Trust with simple signing **(recommended)**:*

```yaml
steps:
  - name: Setup SM_CLIENT_CERT_FILE from base64 secret data
    run: |
      export SM_CLIENT_CERT_FILE=${RUNNER_TEMP_DIR}/sm_client_cert.p12
      echo "${{ secrets.SM_CLIENT_CERT_FILE_B64 }}" | base64 --decode > ${SM_CLIENT_CERT_FILE}
    shell: bash
  - name: Setup Software Trust Manager
    uses: digicert/code-signing-software-trust-action@v1
    with:
      simple-signing-mode: true
      # If the below 2 parameters are supplied, then smctl executable is invoked to attempt the signing.
      input: <file or directory with list of supported files to sign>
      keypair-alias: <a Software Trust Manager keypair to sign with>
    env:
      SM_HOST: ${{ vars.SM_HOST }}
      SM_API_KEY: ${{ secrets.SM_API_KEY }}
      SM_CLIENT_CERT_FILE: ${SM_CLIENT_CERT_FILE}
      SM_CLIENT_CERT_PASSWORD: ${{ secrets.SM_CLIENT_CERT_PASSWORD }}
    shell: bash
```


### Step 3: Customize setup (inputs)

Review the following variables that you can use to customize your setup:

| Name                         | Type     | Default                        | Description|
|-                             |-         |-                               |-|
| `digicert-cdn`               | Optional |<https://pki-downloads.digicert.com/stm/latest>   |The URL for the DigiCert® CDN used to download the required Software Trust tools.|
| `keypair-alias`              | Optional | Not applicable                               |A keypair alias.|
| `input`                      | Optional | Not applicable                                 |A file or directory that contains the supported files to sign.|
| `digest-alg`                | Optional | SHA-256                        |Digest (hash) algorithm.|
| `fail-fast`                  | Optional | True                           |Allows signing of all supported files in a directory, even if some files encounter an error. Only applies if the input is a directory with multiple supported files.|
| `zero-exit-code-on-failure`  | Optional | False                          |Returns an exit code of **0** even if errors occur during execution. (Not recommended.)|
| `unsigned`                   | Optional | False                          |Signs only unsigned files.|
| `timestamp`                  | Optional | True                           |Enables or disables timestamping on signed files.|
| `cache-version`              | Optional | 0.0.0-0                        |Overrides the default [Github tool cache][tool-cache-ref] key to prompt GitHub runners to download the next available version.<br/>This value is used only for caching purposes and doesn't affect the actual tool version.|
| `simple-signing-mode`        | Optional | False                          |Installs **smctl** to enable simplified signing, which eliminates the need for third-party signing tools and provides consistent cross-platform support.|
| `use-github-caching-service` | Optional | True                           |Enables GitHub’s built-in caching service. This stores Software Trust tools across workflow runs since default tool caching is not supported on GitHub runners.|
| `use-binary-sha256-checksum` | Optional | True                           |Use the SHA-256 checksum file provided on the CDN to handle caching. This ensures that new versions are automatically downloaded when they are available. If this option is not enabled, the system instead relies on cache-version to determine whether a new download is needed. This workflow functions when cache-version is updated and 'use-github-caching-service' is enabled.|
| `bulk-sign-mode`             | Optional | False                          |Signs multiple files in a single batch operation; only works with `simple-signing-mode`. This feature must be enabled for your account. [Contact DigiCert][digicert-sales-ref] to request access.|

### Step 4: Review required environment variables

|Environment variable                      | Description| Recommendation|
|-                         |-           |-              |
|SM_HOST                   |The specific environment URL used to connect to Software Trust.|[Use GitHub Actions variables][github-vars-ref]|
|SM_API_KEY                |An API key generated from your DigiCert® ONE account to use with a service user account.|[Use GitHub Actions secrets][github-secrets-ref]|
|SM_CLIENT_CERT_FILE       |A .p12-format client certificate file generated for the service user from DigiCert® ONE Account Manager.|[Use GitHub Actions secrets][github-secrets-ref]|
|SM_CLIENT_CERT_PASSWORD   |The password for the encrypted .p12 client certificate file. |[Use GitHub Actions secrets][github-secrets-ref]|

> **Note**: Since the client certificate is downloaded as a .p12 file from the DigiCert® ONE Account Manager, as a best practice you should store the file content as a Base64-encoded string in a secret. When you execute, you can decode it into a file using the `base64` command (or an equivalent tool).
>
> Review the following example to generate the certificate file from the Base64 secret:
>
> ```yaml
>   steps:
>  - name: Setup SM_CLIENT_CERT_FILE from base64 secret data
>    run: |
>      export SM_CLIENT_CERT_FILE=${RUNNER_TEMP_DIR}/sm_client_cert.p12
>      echo "${{ secrets.SM_CLIENT_CERT_FILE_B64 }}" | base64 --decode > ${SM_CLIENT_CERT_FILE}
>    shell: bash
> ```
>
> The `base64` command is available by default on **Linux** and **macOS**. For **Windows** runners, verify that the command is supported.

## Outputs

The following outputs are provided by this action:

| Name             | Description |
|------------------|-------------|
| `PKCS11_CONFIG`  | This is the full path to the PKCS#11 configuration file (`pkc11Properties.cfg`). The file is automatically generated when you install Software Trust tools and includes the library path to the PKCS#11 module. Use the value in the output when configuring PKCS#11 for signing operations with third-party tools. |

**Sample usage:**

```yaml
- name: Setup Software Trust Manager
  id: stm-setup
  uses: digicert/code-signing-software-trust-action@v1
  env:
    SM_HOST: ${{ vars.SM_HOST }}
    SM_API_KEY: ${{ secrets.SM_API_KEY }}
    SM_CLIENT_CERT_FILE: ${{ env.SM_CLIENT_CERT_FILE }}
    SM_CLIENT_CERT_PASSWORD: ${{ secrets.SM_CLIENT_CERT_PASSWORD }}
  shell: bash

- name: Use PKCS11 config in subsequent step
  run: |
    echo "PKCS11 config file location: ${{ steps.stm-setup.outputs.PKCS11_CONFIG }}"
    # Use the config file with your signing tool
  shell: bash
```

## User guides / documentation 

For information on Software Trust, visit [DigiCert's documentation site](https://docs.digicert.com/en/software-trust-manager.html).

## Feedback and issues

For Technical Support or Sales, [contact DigiCert][digicert-sales-ref].

## Additional information

For more information about centralizing and automating your code signing workflows with Software Trust, contact [Sales](mailto:sales@digicert.com) or visit [DigiCert.com](https://www.digicert.com/software-trust-manager).

## Acknowledgements

This project uses various third-party open-source libraries. For a complete list of dependencies and their licenses, see [LICENSE_ACKNOWLEDGEMENTS.md](LICENSE_ACKNOWLEDGEMENTS.md).
