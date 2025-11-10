[github-secrets-ref]: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
[github-vars-ref]: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables
[stm-ref]: https://www.digicert.com/software-trust-manager
[tool-cache-ref]: https://github.com/actions/toolkit/tree/main/packages/cache
[digicert-sales-ref]: https://www.digicert.com/contact-us
[github-hosted-runners-ref]: https://docs.github.com/en/actions/concepts/runners/github-hosted-runners
[self-hosted-runners-ref]: https://docs.github.com/en/actions/concepts/runners/self-hosted-runners

# Code signing with DigiCert® Software Trust Manager

Code signing with DigiCert® Software Trust Manager and GitHub Actions is a streamlined, keypair-based signing workflow that improves software security and seamlessly integrates with DevOps processes to sign binaries on **Windows**, **Linux**, and **Mac**.

GitHub Actions automates the installation and configuration of Software Trust client tools, enabling developers to quickly become signing-ready for workflows on [GitHub-hosted runners][github-hosted-runners-ref] and [self-hosted runners][self-hosted-runners-ref].

Additionally, Software Trust with GitHub Actions offers simple signing, which allows users to sign without the need of third-party tools or libraries.

## Introduction to Software Trust

Software Trust provides a solution to manage and automate your code signing workflows in a secure way. 

**Software Trust will:**

- Require multi-factor authentication (MFA) for signing
- Prevent unauthorized access or misuse of keys and certificates
- Enforce consistency and compliance of security policies
- Protect against malware insertion during software releases
- Expedite remediation by providing an audit history of all actions taken within your account

**Software Trust allows you to securely:**

- Generate and manage your credentials
- Create, edit, import, export, or delete keypairs
- Generate certificates using a keypair in your account
- View your audit and signature logs
- Create releases
- Sign code

## Get started

> **💡 Recommendation: Use Simple Signing Mode**
>
> We **strongly recommend** using `simple-signing-mode: true` for new implementations. This mode:
>
> - ✅ **Simplifies your workflow** - No need for third-party signing tools (signtool, jarsigner ..) or intermediate libraries (smksp, smpkcs11 ..)
> - ✅ **Cross-platform support** - Works seamlessly across Windows, Linux, and macOS
> - ✅ **Unified signing experience** - One consistent approach for all supported file types
> - ✅ **Future-ready** - Aligned with our strategic direction as we deprecate legacy signing methods
> - ✅ **Better performance** - Simple signing mode is faster than traditional signing as it eliminates the overhead of intermediate libraries and third-party tool integrations and unnecessary API calls.
> - ✅ **Further optimization** - Enable `bulk-sign-mode: true` to sign multiple files in a single batch operation, significantly reducing network round trips and improving throughput for large-scale signing (requires account feature enablement - [contact DigiCert][digicert-sales-ref])
>
> **Why is it disabled by default?**  
> Simple signing mode is disabled by default to ensure seamless migration from our legacy GitHub Action without breaking existing workflows. However, we encourage all new users to adopt simple signing mode and existing users to migrate when possible.
>
> **For new users:** Start with simple signing mode from day one.  
> **For existing users:** Plan to migrate to simple signing mode to take advantage of simplified workflows, improved cross-platform support, and better performance.

### Step 1: Obtain a DigiCert ONE account

Software Trust is part of the DigiCert® ONE platform, which also includes DigiCert® Trust Lifecycle Manager, DigiCert® Document Trust Manager, and DigiCert® IoT Trust Manager, enabling organizations to manage their diverse PKI workflows from a single pane of glass.

To access Software Trust, you must have a DigiCert ONE account. If you don't have a DigiCert ONE account, you can request a 30-day free trial account from [DigiCert Sales][digicert-sales-ref].

### Step 2: Update YAML file

Copy and paste one of the following steps into your GitHub Actions workflow YAML file to obtain the latest stable version of Software Trust:

**Software Trust with standard features:**

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
```

**Software Trust with simplified signing:**

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
```

To learn more about these steps, see [action.yml](action.yml).

### Step 3: Customize setup (inputs)

Review the following variables that you can use to customize your setup:

| Name                         | Type     | Default                        | Description|
|-                             |-         |-                               |-|
| `digicert-cdn`               | Optional |<https://pki-downloads.digicert.com/stm/latest>   |The URL for the DigiCert® CDN used to download the required Software Trust tools.|
| `keypair-alias`              | Optional | Not applicable                               |A keypair alias.|
| `input`                      | Optional | Not applicable                                 |A file or directory contained supported files to sign.|
| `digest-alg`                | Optional | SHA-256                        |Digest (hash) algorithm.|
| `fail-fast`                  | Optional | True                           |Allows signing of all supported files in a directory, even if some files encounter an error. Only applies if the input is a directory with multiple supported files.|
| `zero-exit-code-on-failure`  | Optional | False                          |Returns an exit code of **0** even if errors occur during execution. (Not recommended.)|
| `unsigned`                   | Optional | False                          |Signs only unsigned files.|
| `timestamp`                  | Optional | True                           |Enables or disables timestamping on signed files.|
| `cache-version`              | Optional | 0.0.0-0                        |Overrides the default [Github tool cache][tool-cache-ref] key to prompt GitHub runners to download the next available version.<br/>This value is used only for caching purposes and does not affect the actual tool version.|
| `simple-signing-mode`        | Optional | False                          |Installs only **smctl** to enable simplified signing. **Recommended for new implementations** - eliminates the need for third-party signing tools and provides consistent cross-platform support.|
| `use-github-caching-service` | Optional | True                           |Enables GitHub’s built-in caching service. This stores Software Trust tools across workflow runs since default tool caching is not supported on GitHub runners.|
| `use-binary-sha256-checksum` | Optional | True                           |Uses SHA256 checksum from CDN for automatic version detection and caching. When enabled, tools are automatically updated when new versions are released.|
| `bulk-sign-mode`             | Optional | False                          |Signs multiple files in a single batch operation. Only works with `simple-signing-mode`. **Recommended for high-volume signing** - significantly reduces network round trips and improves throughput compared to sequential simple signing. **Note:** This feature must be enabled for your account. [Contact DigiCert][digicert-sales-ref] to request access.|

### Step 4: Review required environment variables

|Environment variable                      | Description| Recommendation|
|-                         |-           |-              |
|SM_HOST                   |The specific environment URL used to connect to Software Trust.|[Use GitHub Actions variables][github-vars-ref]|
|SM_API_KEY                |An API key generated from your DigiCert® ONE account to use with a service user account.|[Use GitHub Actions secrets][github-secrets-ref]|
|SM_CLIENT_CERT_FILE       |A .p12-format client certificate file generated for the service user from DigiCert® ONE Account Manager.|[Use GitHub Actions secrets][github-secrets-ref]|
|SM_CLIENT_CERT_PASSWORD   |The password for the encrypted .p12 client certificate file. |[Use GitHub Actions secrets][github-secrets-ref]|

> **Note**: Since the client certificate is downloaded as a .p12 file from the DigiCert® ONE Account Manager, we recommend that you store the file content as a Base64-encoded string in a secret. When you execute, you can decode it into a file using the `base64` command (or an equivalent tool).
>
> Review the following example to generate the certificate file from the Base64 secret:
>
> ```yaml
>   steps:
>  - name: Setup SM_CLIENT_CERT_FILE from base64 secret data
>    run: |
>      export SM_CLIENT_CERT_FILE=${RUNNER_TEMP_DIR}/sm_client_cert.p12
>      echo "${{ secrets.SM_CLIENT_CERT_FILE_B64 }}" | base64 --decode > ${SM_CLIENT_CERT_FILE}
>      shell: bash
> ```
>
> The `base64` command is available by default on **Linux** and **macOS**. For **Windows** runners, verify that the command is supported.

## Outputs

The following outputs are provided by this action:

| Name             | Description |
|------------------|-------------|
| `PKCS11_CONFIG`  | The absolute path to the PKCS#11 configuration file (`pkc11Properties.cfg`). This file is automatically generated when Software Trust tools are installed and contains the library path to the PKCS#11 module. Use this output in subsequent steps that require PKCS#11 configuration for signing operations with third-party tools. |

**Example usage:**

```yaml
- name: Setup Software Trust Manager
  id: stm-setup
  uses: digicert/code-signing-software-trust-action@v1
  env:
    SM_HOST: ${{ vars.SM_HOST }}
    SM_API_KEY: ${{ secrets.SM_API_KEY }}
    SM_CLIENT_CERT_FILE: ${{ env.SM_CLIENT_CERT_FILE }}
    SM_CLIENT_CERT_PASSWORD: ${{ secrets.SM_CLIENT_CERT_PASSWORD }}

- name: Use PKCS11 config in subsequent step
  run: |
    echo "PKCS11 config file location: ${{ steps.stm-setup.outputs.PKCS11_CONFIG }}"
    # Use the config file with your signing tool
```

## Documentation

For information on Software Trust, visit [DigiCert's documentation site](https://docs.digicert.com/en/software-trust-manager.html).

## Feedback and issues

For Technical Support or Sales, [contact DigiCert][digicert-sales-ref].

## Additional information

For more information about centralizing and automating your code signing workflows with Software Trust, contact [Sales](mailto:sales@digicert.com) or visit [DigiCert.com](https://www.digicert.com/software-trust-manager).

## Acknowledgements

This project uses various third-party open-source libraries. For a complete list of dependencies and their licenses, see [LICENSE_ACKNOWLEDGEMENTS.md](LICENSE_ACKNOWLEDGEMENTS.md).
