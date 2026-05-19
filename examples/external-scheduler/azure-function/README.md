# Azure Function scheduler

[![Deploy to Azure][deploy-badge]][deploy-url]

Use an Azure Functions timer trigger to dispatch the token-provider workflow on
an interval.

## Prerequisites

- Azure account
- [Azure Functions Core Tools][functions-core-tools]

## Configure

The ARM template creates a Key Vault with an empty `github-app-pk` secret. After
deploying, update the secret with your PEM key:

```sh
az keyvault secret set \
  --vault-name <keyVaultName from deployment outputs> \
  --name github-app-pk \
  --file github-app.pem
```

The Function App uses a system-assigned managed identity with the Key Vault
Secrets User role, so the Key Vault reference resolves automatically.

## Deploy

Click the button above, or deploy from the CLI:

```sh
az deployment group create \
  --resource-group <resource-group> \
  --template-file azuredeploy.json \
  --parameters functionAppName=<name> gitHubAppId=<app-id> gitHubRepo=<owner/repo>
```

After deployment, update the Key Vault secret as described above, then publish
the function code:

```sh
func azure functionapp publish <function-app>
```

The 30-minute timer schedule is registered in code via `app.timer()`.

[deploy-badge]: https://aka.ms/deploytoazurebutton
[deploy-url]:
  https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fghalactic%2Fprovision-github-tokens%2Fmain%2Fexamples%2Fexternal-scheduler%2Fazure-function%2Fazuredeploy.json
[functions-core-tools]:
  https://learn.microsoft.com/azure/azure-functions/functions-run-local
