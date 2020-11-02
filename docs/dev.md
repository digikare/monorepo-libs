# DEV

Dev guides

# requirements

- yarn
- node v12

# Dev

## Setup

```bash
$ yarn
$ yarn bootstrap
```

## How to create a new library

Create the folder name in `./packages` fodler with the wanted library name

```bash
$ cd ./packages
$ mkdir my_package_name
$ yarn init
```

## How to add a local package to an other

```bash
$ cd packages/{working_package_name}
$ npx lerna add @digikare/{dep_package_name} --scope=@digikare/{working_package_name}
```

## How to remove a dependency

```bash
$ lerna exec -- yarn remove {package_name}
```

## How to publish

```bash
$ lerna publish --no-private
```

# References

- https://medium.com/@jsilvax/a-workflow-guide-for-lerna-with-yarn-workspaces-60f97481149d
- https://samhogy.co.uk/2018/08/lerna-independent-mode-with-semver.html
