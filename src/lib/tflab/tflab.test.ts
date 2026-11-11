// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { tfScenarioById } from '../../content/tflab'
import { checkScenario, replay } from './checks'
import { complete, formatHcl, runCommand, tokenize } from './commands'
import { loadConfig } from './config'
import { createEnv, plan, renderPlan, type EnvSeed } from './engine'
import { HclError, parseExpression, parseHcl } from './hcl'
import { evaluate } from './eval'

const PROVIDERS = 'provider "azurerm" {\n  features {}\n}\n'
const ctx = { file: 'x.tf', resolve: () => ({ value: null, used: 0 }) }
const value = (src: string) => evaluate(parseExpression(src), ctx)

describe('HCL parser', () => {
  it('parses blocks, attributes, nested blocks and comments', () => {
    const body = parseHcl(
      `# comment\nresource "azurerm_resource_group" "rg" {\n  name = "x" // trailing\n  tags = { a = "b", "c" = 1 }\n  lifecycle { prevent_destroy = true }\n}\n`,
      'main.tf',
    )
    expect(body.blocks[0].labels).toEqual(['azurerm_resource_group', 'rg'])
    expect(body.blocks[0].body.attrs.map((attr) => attr.name)).toEqual(['name', 'tags'])
    expect(body.blocks[0].body.blocks[0].type).toBe('lifecycle')
  })

  it('evaluates expressions, functions, templates and for expressions', () => {
    expect(value('[1, 2, 3][1] + 2')).toBe(4)
    expect(value('"snet-${upper("web")}"')).toBe('snet-WEB')
    expect(value('{ for s in ["a", "b"] : s => length(s) }')).toEqual({ a: 1, b: 1 })
    expect(value('[for s in toset(["b", "a", "b"]) : s]')).toEqual(['a', 'b'])
    expect(value('true ? cidrsubnet("10.0.0.0/16", 8, 2) : "no"')).toBe('10.0.2.0/24')
    expect(value('merge({ a = 1 }, { b = 2 })')).toEqual({ a: 1, b: 2 })
  })

  it('reports syntax errors with the file and line', () => {
    try {
      parseHcl('resource "a" "b" {\n  name = "x" extra\n}\n', 'main.tf')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(HclError)
      expect((error as HclError).diagnostic).toMatchObject({
        summary: 'Missing newline after argument',
        file: 'main.tf',
        line: 2,
      })
    }
    expect(() => parseHcl('resource "a" "b" {\n  name = "x"\n', 'main.tf')).toThrow(
      /Unclosed configuration block/,
    )
  })

  it('validates arguments against the provider schema', () => {
    const { diagnostics } = loadConfig({
      'providers.tf': PROVIDERS,
      'main.tf': 'resource "azurerm_resource_group" "rg" {\n  name = "x"\n  colour = "blue"\n}\n',
    })
    const summaries = diagnostics.map((diag) => diag.summary)
    expect(summaries).toContain('Missing required argument')
    expect(summaries).toContain('Unsupported argument')
  })
})

const seed = (main: string, extra: Partial<EnvSeed> = {}): EnvSeed => ({
  files: { 'providers.tf': PROVIDERS, 'main.tf': main },
  cloud: [
    { key: 'rg', type: 'azurerm_resource_group', attrs: { name: 'rg-a', location: 'westeurope' } },
    {
      key: 'sa',
      type: 'azurerm_storage_account',
      attrs: {
        name: 'stalpha01',
        resource_group_name: 'rg-a',
        location: 'westeurope',
        account_tier: 'Standard',
        account_replication_type: 'LRS',
      },
    },
  ],
  state: [
    { addr: 'azurerm_resource_group.a', key: 'rg' },
    { addr: 'azurerm_storage_account.a', key: 'sa' },
  ],
  ...extra,
})

const SA = (location: string, extra = '') => `resource "azurerm_resource_group" "a" {
  name     = "rg-a"
  location = "westeurope"
}

resource "azurerm_storage_account" "a" {
  name                     = "stalpha01"
  resource_group_name      = azurerm_resource_group.a.name
  location                 = "${location}"
  account_tier             = "Standard"
  account_replication_type = "LRS"
${extra}}
`

describe('plan engine', () => {
  it('reports no changes when code, state and Azure agree', () => {
    const text = renderPlan(plan(createEnv(seed(SA('westeurope')))))
    expect(text).toContain('No changes. Your infrastructure matches the configuration.')
  })

  it('marks ForceNew attributes and counts a replacement', () => {
    const text = renderPlan(plan(createEnv(seed(SA('northeurope')))))
    expect(text).toContain('# azurerm_storage_account.a must be replaced')
    expect(text).toContain('~ location')
    expect(text).toContain('# forces replacement')
    expect(text).toContain('Plan: 1 to add, 0 to change, 1 to destroy.')
  })

  it('updates in place, honours ignore_changes and reports drift', () => {
    const drifted = seed(
      SA('westeurope', '  min_tls_version = "TLS1_2"\n  tags = { env = "prod" }\n'),
      {},
    )
    drifted.cloud[1].attrs = {
      ...drifted.cloud[1].attrs,
      min_tls_version: 'TLS1_0',
      tags: { env: 'prod' },
    }
    drifted.state[1].drift = { min_tls_version: 'TLS1_2' }
    const text = renderPlan(plan(createEnv(drifted)))
    expect(text).toContain('Objects have changed outside of Terraform')
    expect(text).toContain('~ min_tls_version = "TLS1_0" -> "TLS1_2"')
    expect(text).toContain('Plan: 0 to add, 1 to change, 0 to destroy.')

    const ignored = createEnv(drifted)
    ignored.files['main.tf'] = SA(
      'westeurope',
      '  min_tls_version = "TLS1_2"\n  tags = { env = "prod" }\n  lifecycle {\n    ignore_changes = [min_tls_version]\n  }\n',
    )
    expect(renderPlan(plan(ignored))).toContain('No changes.')
  })

  it('fails a plan that would destroy a prevent_destroy resource', () => {
    const env = createEnv(
      seed(SA('northeurope', '  lifecycle {\n    prevent_destroy = true\n  }\n')),
    )
    const result = plan(env)
    expect(result.ok).toBe(false)
    expect(renderPlan(result)).toContain('Error: Instance cannot be destroyed')
  })

  it('applies: recreating gives a new identity and an existing name fails with "already exists"', () => {
    const env = createEnv(seed(SA('northeurope')))
    const id = Object.keys(env.cloud).find((key) => key.includes('storageaccounts'))!
    const before = env.cloud[id].uid
    const out = runCommand(env, { pending: null }, 'terraform apply -auto-approve')
    expect(out.output).toContain('Apply complete! Resources: 1 added, 0 changed, 1 destroyed.')
    expect(env.cloud[id.replace('westeurope', '')].uid).not.toBe(before)

    const clash = createEnv(
      seed(
        SA('westeurope').replace(
          '"a" {\n  name                     = "stalpha01"',
          '"b" {\n  name                     = "stalpha01"',
        ),
      ),
    )
    runCommand(clash, { pending: null }, 'terraform state rm azurerm_storage_account.a')
    const failed = runCommand(clash, { pending: null }, 'terraform apply -auto-approve')
    expect(failed.output).toContain(
      'already exists - to be managed via Terraform this resource needs to be imported',
    )
  })

  it('handles moved, refresh-only, saved plans and prompts', () => {
    const env = createEnv(
      seed(
        SA('westeurope').replace(
          '"a" {\n  name                     = "stalpha01"',
          '"b" {\n  name                     = "stalpha01"',
        ) + 'moved {\n  from = azurerm_storage_account.a\n  to   = azurerm_storage_account.b\n}\n',
      ),
    )
    const session = { pending: null }
    expect(runCommand(env, session, 'terraform plan -out=tfplan').output).toContain(
      'azurerm_storage_account.a has moved to azurerm_storage_account.b',
    )
    const asked = runCommand(env, session, 'terraform apply')
    expect(asked.awaiting).toBe('Enter a value:')
    expect(runCommand(env, session, 'no').output).toContain('Apply cancelled.')
    expect(runCommand(env, session, 'terraform apply tfplan').output).toContain('Apply complete!')
    expect(runCommand(env, session, 'terraform state list').output).toContain(
      'azurerm_storage_account.b',
    )
    expect(runCommand(env, session, 'terraform apply tfplan').output).toContain(
      'Saved plan is stale',
    )
  })
})

describe('terminal helpers', () => {
  it('tokenizes like a shell and completes addresses', () => {
    expect(tokenize(`terraform state mv 'a[0]' "b[\\"x\\"]"`)).toEqual([
      'terraform',
      'state',
      'mv',
      'a[0]',
      'b["x"]',
    ])
    const env = createEnv(seed(SA('westeurope')))
    expect(complete(env, 'terraform state show azurerm_st').input).toBe(
      'terraform state show azurerm_storage_account.a ',
    )
    expect(complete(env, 'terr').input).toBe('terraform ')
  })

  it('formats HCL like terraform fmt', () => {
    expect(formatHcl('resource "a" "b" {\nname = "x"\n    location="y"\n}\n')).toBe(
      'resource "a" "b" {\n  name     = "x"\n  location = "y"\n}\n',
    )
  })

  it('answers read-only az commands and refuses writes', () => {
    const env = createEnv(seed(SA('westeurope')))
    expect(
      runCommand(env, { pending: null }, 'az resource list -g rg-a -o table').output,
    ).toContain('stalpha01')
    expect(
      runCommand(
        env,
        { pending: null },
        'az storage account show -n stalpha01 --query sku.name -o tsv',
      ).output,
    ).toBe('Standard_LRS')
    expect(runCommand(env, { pending: null }, 'az group delete -n rg-a').error).toBe(true)
  })
})

describe('checks', () => {
  it('explain in plain words why a destroy-and-recreate fix fails', () => {
    const scenario = tfScenarioById.get('rename-moved')!
    const report = checkScenario(
      scenario,
      replay(scenario, [{ kind: 'run', command: 'terraform apply -auto-approve' }]),
    )
    const kept = report.results.find(
      (result) => result.label === 'Nothing was destroyed or recreated',
    )
    expect(kept?.passed).toBe(false)
    expect(kept?.messages[0]).toMatch(/stshopdiagprod01 was destroyed and created again/)
  })

  it('flags a stale lock and a pending plan', () => {
    const scenario = tfScenarioById.get('state-lock')!
    const report = checkScenario(scenario, createEnv(scenario.seed))
    expect(
      report.results.find((result) => result.label === 'The state is not locked')?.passed,
    ).toBe(false)
    expect(
      report.results
        .find((result) => result.label === 'terraform plan shows no changes')
        ?.messages.join(' '),
    ).toMatch(/Error acquiring the state lock/)
  })
})
