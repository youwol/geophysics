
const runTimeDependencies = {
    "externals": {
        "@youwol/dataframe": "^0.1.0",
        "@youwol/math": "^0.1.0",
        "@youwol/io": "^0.1.0"
    },
    "includedInBundle": {}
}
const externals = {
    "@youwol/dataframe": {
        "commonjs": "@youwol/dataframe",
        "commonjs2": "@youwol/dataframe",
        "root": "@youwol/dataframe_APIv01"
    },
    "@youwol/math": {
        "commonjs": "@youwol/math",
        "commonjs2": "@youwol/math",
        "root": "@youwol/math_APIv01"
    },
    "@youwol/io": {
        "commonjs": "@youwol/io",
        "commonjs2": "@youwol/io",
        "root": "@youwol/io_APIv01"
    }
}
const exportedSymbols = {
    "@youwol/dataframe": {
        "apiKey": "01",
        "exportedSymbol": "@youwol/dataframe"
    },
    "@youwol/math": {
        "apiKey": "01",
        "exportedSymbol": "@youwol/math"
    },
    "@youwol/io": {
        "apiKey": "01",
        "exportedSymbol": "@youwol/io"
    }
}

const mainEntry : {entryFile: string,loadDependencies:string[]} = {
    "entryFile": "./index.ts",
    "loadDependencies": [
        "@youwol/dataframe",
        "@youwol/math",
        "@youwol/io"
    ]
}

const secondaryEntries : {[k:string]:{entryFile: string, name: string, loadDependencies:string[]}}= {}

const entries = {
     '@youwol/geophysics': './index.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`@youwol/geophysics/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'@youwol/geophysics',
        assetId:'QHlvdXdvbC9nZW9waHlzaWNz',
    version:'0.1.21-wip',
    shortDescription:"geophysics package for YouWol",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/geophysics&tab=doc',
    npmPackage:'https://www.npmjs.com/package/@youwol/geophysics',
    sourceGithub:'https://github.com/youwol/geophysics',
    userGuide:'https://l.youwol.com/doc/@youwol/geophysics',
    apiVersion:'01',
    runTimeDependencies,
    externals,
    exportedSymbols,
    entries,
    secondaryEntries,
    getDependencySymbolExported: (module:string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    },

    installMainModule: ({cdnClient, installParameters}:{
        cdnClient:{install:(unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const parameters = installParameters || {}
        const scripts = parameters.scripts || []
        const modules = [
            ...(parameters.modules || []),
            ...mainEntry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/geophysics_APIv01`]
        })
    },
    installAuxiliaryModule: ({name, cdnClient, installParameters}:{
        name: string,
        cdnClient:{install:(unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const entry = secondaryEntries[name]
        if(!entry){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `@youwol/geophysics#0.1.21-wip~dist/@youwol/geophysics/${entry.name}.js`
        ]
        const modules = [
            ...(parameters.modules || []),
            ...entry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/geophysics/${entry.name}_APIv01`]
        })
    },
    getCdnDependencies(name?: string){
        if(name && !secondaryEntries[name]){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const deps = name ? secondaryEntries[name].loadDependencies : mainEntry.loadDependencies

        return deps.map( d => `${d}#${runTimeDependencies.externals[d]}`)
    }
}
