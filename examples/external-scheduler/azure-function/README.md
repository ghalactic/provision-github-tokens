# Azure Function scheduler

[![Deploy to Azure][deploy-badge]][deploy-url]

Use an Azure Functions timer trigger to dispatch the token-provider workflow on
an interval.

## Prerequisites

- Azure account
- [Azure Functions Core Tools][functions-core-tools]

## Configure

Use app settings for `GITHUB_APP_ID`, `GITHUB_REPO`, and `GITHUB_WORKFLOW`.
Store `GITHUB_APP_PK` in Key Vault and reference it from the Function App.

## Deploy

Create a Function App and Key Vault first. The manual path below also uses the
[Azure CLI][azure-cli].

Store the private key in Key Vault:

```sh
az keyvault secret set \
  --vault-name <key-vault> \
  --name github-app-pk \
  --file github-app.pem
```

Set the application settings, using a Key Vault reference for the private key:

```sh
az functionapp config appsettings set \
  --name <function-app> \
  --resource-group <resource-group> \
  --settings \
  "GITHUB_APP_ID=<app-id>" \
  "GITHUB_REPO=<owner/repo>" \
  "GITHUB_WORKFLOW=<workflow>" \
  "GITHUB_APP_PK=@Microsoft.KeyVault(SecretUri=https://<key-vault>.vault.azure.net/secrets/github-app-pk/)"
```

Publish from this directory:

```sh
func azure functionapp publish <function-app>
```

The 30-minute timer schedule is already configured in `function.json`.

[deploy-badge]: https://aka.ms/deploytoazurebutton
[deploy-url]:
  https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fghalactic%2Fprovision-github-tokens%2Fmain%2Fexamples%2Fexternal-scheduler%2Fazure-function%2Fazuredeploy.json
[functions-core-tools]:
  https://learn.microsoft.com/azure/azure-functions/functions-run-local
[azure-cli]: https://learn.microsoft.com/cli/azure/install-azure-cli
