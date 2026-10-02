import { beforeEach, describe, expect, it } from 'vitest'
import { courseIndexes } from '../../content/registry'
import { missions } from '../../content/azcli'
import { buildCatalog, parseTemplate } from './catalog'
import { evaluateMission } from './missions'
import { runPowerShell } from './powershell'
import { answer, complete, createSession, run, type Session } from './shell'
import { emptyCloud } from './state'

const catalog = buildCatalog(courseIndexes.map((entry) => entry.course))
let session: Session

/** Runs a command and returns its printed text; errors are thrown. */
const az = (line: string) => {
  const result = run(line, session)
  const error = result.lines.find((entry) => entry.kind === 'err')
  if (error) throw new Error(error.text)
  return result.lines.map((entry) => entry.text).join('\n')
}
const json = (line: string) => JSON.parse(az(line)) as unknown
const fails = (line: string) => {
  const result = run(line, session)
  const error = result.lines.find((entry) => entry.kind === 'err')
  if (!error) throw new Error(`expected "${line}" to fail`)
  return error.text
}
const ps = (line: string) => runPowerShell(line, session)

beforeEach(() => {
  session = createSession(catalog, emptyCloud())
})

describe('the command catalog', () => {
  it('knows every az command in the three command references', () => {
    for (const { course } of courseIndexes) {
      for (const group of course.commandGroups) {
        for (const entry of group.entries) {
          const parsed = parseTemplate(entry.command)
          if (parsed) expect(catalog.commands.has(parsed.path.join(' ')), entry.command).toBe(true)
        }
      }
    }
    expect(catalog.commands.size).toBeGreaterThan(100)
  })

  it('reads required parameters from the template placeholders', () => {
    expect(parseTemplate('az lock create --name <name> --lock-type CanNotDelete -g <rg>')).toEqual({
      path: ['lock', 'create'],
      params: [
        { name: '--name', aliases: undefined, flag: false, required: true },
        { name: '--lock-type', aliases: undefined, flag: false, required: false },
        { name: '--resource-group', aliases: ['-g'], flag: false, required: true },
      ],
    })
  })
})

describe('resource groups and state', () => {
  it('creates a group and lists it', () => {
    const created = json('az group create --name rg-learn --location uksouth') as {
      id: string
      properties: unknown
    }
    expect(created.id).toMatch(/\/resourceGroups\/rg-learn$/)
    expect(created.properties).toEqual({ provisioningState: 'Succeeded' })
    expect(az('az group list -o table')).toMatch(
      /Name\s+Location\s+Status\n-+\s+-+\s+-+\nrg-learn\s+uksouth\s+Succeeded/,
    )
    expect(az('az group exists -n rg-learn')).toBe('true')
  })

  it('applies --query before --output, like az', () => {
    az('az group create -n rg-a -l uksouth')
    az('az group create -n rg-b -l westeurope')
    expect(az('az group list --query "[?location==\'westeurope\'].name" -o tsv')).toBe('rg-b')
    expect(json('az group list --query "length(@)"')).toBe(2)
  })

  it('uses the Azure CLI error messages', () => {
    expect(fails('az group create --name x')).toBe(
      'the following arguments are required: --location/-l',
    )
    expect(fails('az group creat -n x -l uksouth')).toMatch(
      /'creat' is not in the 'az group' command group[\s\S]*similar choice to 'creat' is:\s+create/,
    )
    expect(fails('az group create -n x -l uksouth --colour blue')).toBe(
      'unrecognized arguments: --colour blue',
    )
    expect(fails('az group create -n x -l mars')).toMatch(/LocationNotAvailableForResourceGroup/)
    expect(fails('az group show -n nope')).toMatch(
      /\(ResourceGroupNotFound\) Resource group 'nope' could not be found/,
    )
    expect(fails('az storage account create -n x -g y --sku Cheap_LRS')).toMatch(
      /'Cheap_LRS' is not a valid value for '--sku'/,
    )
  })

  it('asks before deleting, and --yes skips the question', () => {
    az('az group create -n rg-temp -l uksouth')
    const asked = run('az group delete -n rg-temp', session)
    expect(asked.prompt).toMatch(/Are you sure/)
    expect(answer(session, 'n').lines[0].text).toBe('Operation cancelled.')
    expect(session.state.resourceGroups).toHaveLength(1)
    az('az group delete -n rg-temp --yes')
    expect(session.state.resourceGroups).toHaveLength(0)
  })

  it('enforces resource locks', () => {
    az('az group create -n rg-prod -l uksouth')
    az('az lock create -n keep --lock-type CanNotDelete -g rg-prod')
    expect(fails('az group delete -n rg-prod --yes')).toMatch(
      /\(ScopeLocked\)[\s\S]*cannot perform delete operation/,
    )
    az('az network vnet create -g rg-prod -n vnet1')
    az('az lock create -n frozen --lock-type ReadOnly -g rg-prod')
    expect(fails('az network vnet create -g rg-prod -n vnet2')).toMatch(
      /cannot perform write operation/,
    )
  })

  it('remembers defaults from az configure', () => {
    az('az group create -n rg-dev -l uksouth')
    az('az configure --defaults group=rg-dev')
    az('az network nsg create -n nsg-dev')
    expect(session.state.nsgs[0].resourceGroup).toBe('rg-dev')
  })
})

describe('networking', () => {
  beforeEach(() => {
    az('az group create -n rg-web -l uksouth')
    az(
      'az network vnet create -g rg-web -n vnet-web --address-prefixes 10.0.0.0/16 --subnet-name snet-web --subnet-prefixes 10.0.1.0/24',
    )
  })

  it('validates subnet ranges', () => {
    az(
      'az network vnet subnet create -g rg-web --vnet-name vnet-web -n snet-app --address-prefixes 10.0.2.0/24',
    )
    expect(
      fails(
        'az network vnet subnet create -g rg-web --vnet-name vnet-web -n bad --address-prefixes 10.0.1.128/25',
      ),
    ).toMatch(/NetcfgSubnetRangesOverlap.*snet-web/)
    expect(
      fails(
        'az network vnet subnet create -g rg-web --vnet-name vnet-web -n out --address-prefixes 10.9.0.0/24',
      ),
    ).toMatch(/NetcfgSubnetRangeOutsideVnet/)
    expect(
      fails(
        'az network vnet subnet create -g rg-web --vnet-name vnet-web -n odd --address-prefixes 10.0.3.5/24',
      ),
    ).toMatch(/InvalidCIDRNotation.*10\.0\.3\.0\/24/)
    expect(
      az('az network vnet subnet list -g rg-web --vnet-name vnet-web --query "[].name" -o tsv'),
    ).toBe('snet-web\nsnet-app')
  })

  it('creates NSG rules with az defaults and rejects duplicate priorities', () => {
    az('az network nsg create -g rg-web -n nsg-web')
    const rule = json(
      'az network nsg rule create -g rg-web --nsg-name nsg-web -n allow-https --priority 100 --protocol tcp --destination-port-ranges 443',
    ) as Record<string, unknown>
    expect(rule).toMatchObject({
      access: 'Allow',
      direction: 'Inbound',
      protocol: 'Tcp',
      destinationPortRange: '443',
    })
    expect(
      fails('az network nsg rule create -g rg-web --nsg-name nsg-web -n other --priority 100'),
    ).toMatch(/SecurityRuleConflict/)
    az('az network vnet subnet update -g rg-web --vnet-name vnet-web -n snet-web --nsg nsg-web')
    expect(fails('az network nsg delete -g rg-web -n nsg-web')).toMatch(/in use by subnet/)
  })
})

describe('virtual machines and storage', () => {
  beforeEach(() => az('az group create -n rg-vm -l westeurope'))

  it('creates the VNet, NSG and public IP for a VM, as az does', () => {
    const vm = json(
      'az vm create -g rg-vm -n vm1 --image Ubuntu2204 --generate-ssh-keys',
    ) as Record<string, string>
    expect(vm).toMatchObject({
      powerState: 'VM running',
      privateIpAddress: '10.0.0.4',
      location: 'westeurope',
    })
    expect(az('az resource list -g rg-vm --query "[].type" -o tsv').split('\n').sort()).toEqual([
      'Microsoft.Compute/virtualMachines',
      'Microsoft.Network/networkSecurityGroups',
      'Microsoft.Network/publicIPAddresses',
      'Microsoft.Network/virtualNetworks',
    ])
    az('az vm deallocate -g rg-vm -n vm1')
    expect(az('az vm show -g rg-vm -n vm1 -d --query powerState -o tsv')).toBe('VM deallocated')
    expect(fails('az vm create -g rg-vm -n vm2 --image Ubuntu2204')).toMatch(/--generate-ssh-keys/)
  })

  it('validates storage account names and updates settings', () => {
    expect(fails('az storage account create -n Bad_Name -g rg-vm')).toMatch(/AccountNameInvalid/)
    az(
      'az storage account create -n stlegacy -g rg-vm --allow-blob-public-access true --min-tls-version TLS1_0',
    )
    az(
      'az storage account update -n stlegacy -g rg-vm --allow-blob-public-access false --min-tls-version TLS1_2',
    )
    expect(
      json(
        'az storage account show -n stlegacy -g rg-vm --query "{tls: minimumTlsVersion, public: allowBlobPublicAccess}"',
      ),
    ).toEqual({ tls: 'TLS1_2', public: false })
  })

  it('leaves the cloud unchanged when a command fails part-way', () => {
    const before = JSON.stringify(session.state)
    fails('az vm create -g rg-vm -n vm9 --image Ubuntu2204 --generate-ssh-keys --size Huge_VM')
    expect(JSON.stringify(session.state)).toBe(before)
  })
})

describe('the shell', () => {
  it('supports variables and $(...) substitution', () => {
    az('rg=rg-vars')
    az('az group create -n $rg -l uksouth')
    az('id=$(az group show -n $rg --query id -o tsv)')
    expect(az('echo "$id"')).toMatch(/\/resourceGroups\/rg-vars$/)
  })

  it('recognises reference commands it does not model', () => {
    const result = run('az webapp list', session)
    if (catalog.commands.has('webapp list')) expect(result.lines[0].kind).toBe('info')
    expect(run('az webapp create -g x -p plan -n app', session).lines[0].text).toMatch(
      /does not model/,
    )
    expect(fails('git status')).toMatch(/only runs Azure CLI/)
  })

  it('shows help built from the catalog', () => {
    expect(az('az network --help')).toMatch(/Subgroups:[\s\S]*vnet/)
    expect(az('az group create --help')).toMatch(/--location -l\s+: \[Required\]/)
  })

  it('completes commands, parameters and resource names with Tab', () => {
    expect(complete('az net', session).line).toBe('az network ')
    expect(complete('az network vnet su', session).line).toBe('az network vnet subnet ')
    expect(complete('az group create --lo', session).line).toBe('az group create --location ')
    az('az group create -n rg-complete -l uksouth')
    expect(complete('az group show -n rg-c', session).line).toBe('az group show -n rg-complete ')
    expect(
      complete('az storage account create --sku Standard_', session).candidates.length,
    ).toBeGreaterThan(3)
  })
})

describe('PowerShell mode', () => {
  it('runs Az cmdlets against the same cloud', () => {
    ps('New-AzResourceGroup -Name rg-ps -Location northeurope -Tag @{env="dev"}')
    expect(session.state.resourceGroups[0]).toMatchObject({
      name: 'rg-ps',
      location: 'northeurope',
      tags: { env: 'dev' },
    })
    expect(ps('Get-AzResourceGroup -Name rg-ps').lines[0].text).toMatch(
      /ResourceGroupName : rg-ps\nLocation\s+: northeurope/,
    )
    // The az view of the same thing.
    expect(az('az group show -n rg-ps --query tags.env -o tsv')).toBe('dev')
  })

  it('builds VNets with the object-and-pipeline pattern', () => {
    ps('New-AzResourceGroup -Name rg-ps -Location uksouth')
    ps(
      'New-AzVirtualNetwork -Name vnet-ps -ResourceGroupName rg-ps -Location uksouth -AddressPrefix 10.1.0.0/16',
    )
    ps('$vnet = Get-AzVirtualNetwork -Name vnet-ps -ResourceGroupName rg-ps')
    const result = ps(
      'Add-AzVirtualNetworkSubnetConfig -Name snet-a -AddressPrefix 10.1.1.0/24 -VirtualNetwork $vnet | Set-AzVirtualNetwork',
    )
    expect(result.lines[0].text).toMatch(/snet-a \(10\.1\.1\.0\/24\)/)
    expect(session.state.vnets[0].subnets.map((subnet) => subnet.name)).toEqual(['snet-a'])
  })

  it('Stop-AzVM deallocates unless told to stay provisioned', () => {
    ps('New-AzResourceGroup -Name rg-ps -Location uksouth')
    ps('New-AzVM -ResourceGroupName rg-ps -Name vm-ps -Image Ubuntu2204')
    const asked = ps('Stop-AzVM -ResourceGroupName rg-ps -Name vm-ps')
    expect(asked.prompt).toMatch(/stop the specified virtual machine/)
    answer(session, 'y')
    expect(session.state.vms[0].powerState).toBe('VM deallocated')
    ps('Start-AzVM -ResourceGroupName rg-ps -Name vm-ps')
    ps('Stop-AzVM -ResourceGroupName rg-ps -Name vm-ps -StayProvisioned -Force')
    expect(session.state.vms[0].powerState).toBe('VM stopped')
  })

  it('gives PowerShell-style errors', () => {
    expect(ps('New-AzResourceGroup -Name x').lines[0].text).toMatch(
      /missing mandatory parameters: Location/,
    )
    expect(ps('Get-AzWhatever').lines[0].text).toMatch(/is not recognized as a name of a cmdlet/)
    expect(ps('New-AzRoleAssignment -ObjectId x').lines[0].text).toMatch(/does not model/)
  })
})

describe('missions', () => {
  it.each(missions.map((mission) => [mission.id, mission] as const))(
    '%s: setup runs cleanly and the mission starts incomplete',
    (_id, mission) => {
      for (const line of mission.setup) az(line)
      const results = evaluateMission(mission, session.state, [])
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((result) => !result.passed)).toBe(true)
    },
  )

  it('the network foundation mission can be completed', () => {
    const mission = missions.find((candidate) => candidate.id === 'network-foundation')!
    for (const line of [
      'az group create -n rg-web -l uksouth',
      'az network vnet create -g rg-web -n vnet-web --address-prefixes 10.0.0.0/16 --subnet-name snet-web --subnet-prefixes 10.0.1.0/24',
      'az network vnet subnet create -g rg-web --vnet-name vnet-web -n snet-app --address-prefixes 10.0.2.0/24',
      'az network nsg create -g rg-web -n nsg-web',
      'az network nsg rule create -g rg-web --nsg-name nsg-web -n allow-https --priority 100 --protocol Tcp --destination-port-ranges 443',
      'az network vnet subnet update -g rg-web --vnet-name vnet-web -n snet-web --network-security-group nsg-web',
    ]) {
      az(line)
    }
    expect(evaluateMission(mission, session.state, []).filter((result) => !result.passed)).toEqual(
      [],
    )
  })

  it('the lock mission counts a failed delete attempt', () => {
    const mission = missions.find((candidate) => candidate.id === 'protect-production')!
    for (const line of mission.setup) az(line)
    az('az lock create --name do-not-delete --lock-type CanNotDelete --resource-group rg-prod')
    fails('az group delete -n rg-prod --yes')
    const results = evaluateMission(mission, session.state, ['az group delete -n rg-prod --yes'])
    expect(results.every((result) => result.passed)).toBe(true)
  })
})
