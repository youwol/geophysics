import shutil
from pathlib import Path

from youwol.pipelines.pipeline_typescript_weback_npm import (
    Template,
    PackageType,
    Dependencies,
    RunTimeDeps,
    generate_template,
    Bundles,
    MainModule,
)
from youwol.utils import parse_json

folder_path = Path(__file__).parent

pkg_json = parse_json(folder_path / 'package.json')

# ----------------------------------------------------

webpmDependencies = {
    "@youwol/dataframe": "^0.1.0",
    "@youwol/math": "^0.1.0",
    "@youwol/io": "^0.1.0"
}

internalDependencies = {
}

# ----------------------------------------------------

template = Template(
    path=folder_path,
    type=PackageType.LIBRARY,
    name=pkg_json['name'],
    version=pkg_json['version'],
    shortDescription=pkg_json['description'],
    author=pkg_json['author'],
    dependencies=Dependencies(
        runTime=RunTimeDeps(
            externals = webpmDependencies,
            includedInBundle = internalDependencies
        )
    ),
    bundles=Bundles(
        mainModule=MainModule(
            entryFile='./index.ts',
            loadDependencies = list(webpmDependencies.keys())
        )
    ),
    userGuide=True
)

generate_template(template)
shutil.copyfile(
    src=folder_path / '.template' / 'src' / 'auto-generated.ts',
    dst=folder_path / 'src' / 'auto-generated.ts'
)
for file in ['README.md', '.gitignore', '.npmignore', '.prettierignore', 'LICENSE', 'package.json',
             'tsconfig.json', 'webpack.config.ts', 'typedoc.js']:
    shutil.copyfile(
        src=folder_path / '.template' / file,
        dst=folder_path / file
    )
